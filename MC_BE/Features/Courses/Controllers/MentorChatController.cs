using System.Security.Claims;
using System.Text;
using System.Text.Json;
using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api/courses/{courseId:int}")]
[Authorize]
public class MentorChatController : ControllerBase
{
    private readonly IMentorChatService _mentorChatService;
    private readonly SmartMcDbContext _db;
    private readonly IR2StorageService _r2;
    private readonly ILogger<MentorChatController> _logger;

    public MentorChatController(
        IMentorChatService mentorChatService,
        SmartMcDbContext db,
        IR2StorageService r2,
        ILogger<MentorChatController> logger)
    {
        _mentorChatService = mentorChatService;
        _db = db;
        _r2 = r2;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var rawId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return int.TryParse(rawId, out var id) ? id : null;
    }

    private async Task<bool> CanAccessCourseAsync(int courseId, int userId, CancellationToken ct)
    {
        if (User.IsInRole("Admin")) return true;

        var course = await _db.Courses.AsNoTracking()
            .Where(c => c.CourseId == courseId)
            .Select(c => new { c.CourseId, c.InstructorId })
            .FirstOrDefaultAsync(ct);

        if (course == null) return false;
        if (course.InstructorId == userId) return true;

        var now = DateTime.UtcNow;
        return await _db.Enrollments.AsNoTracking()
            .AnyAsync(e => e.CourseId == courseId 
                        && e.LearnerId == userId 
                        && (e.Status == "ACTIVE" || e.Status == "COMPLETED")
                        && (e.ExpiresAt == null || e.ExpiresAt > now), ct);
    }

    private async Task<bool> CanManageCourseAsync(int courseId, int userId, CancellationToken ct)
    {
        if (User.IsInRole("Admin")) return true;

        var course = await _db.Courses.AsNoTracking()
            .Where(c => c.CourseId == courseId)
            .Select(c => new { c.CourseId, c.InstructorId })
            .FirstOrDefaultAsync(ct);

        return course != null && course.InstructorId == userId;
    }

    /// <summary>
    /// Học viên đặt câu hỏi với AI Mentor trong phạm vi khóa học (hoặc bài học cụ thể)
    /// </summary>
    [HttpPost("mentor-chat")]
    public async Task<ActionResult<ApiResponse<MentorChatResponseDto>>> ChatWithMentor(
        int courseId,
        [FromBody] MentorChatRequestDto request,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<MentorChatResponseDto>.FailureResponse("Vui lòng đăng nhập."));

        if (string.IsNullOrWhiteSpace(request?.Message))
            return BadRequest(ApiResponse<MentorChatResponseDto>.FailureResponse("Nội dung câu hỏi không được để trống."));

        var hasAccess = await CanAccessCourseAsync(courseId, userId.Value, ct);
        if (!hasAccess)
            return Forbid();

        try
        {
            var answer = await _mentorChatService.AskQuestionAsync(courseId, request, ct);
            return Ok(ApiResponse<MentorChatResponseDto>.SuccessResponse(answer));
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Lỗi khi gọi dịch vụ MentorChat AI cho Course {CourseId}", courseId);
            return StatusCode(503, ApiResponse<MentorChatResponseDto>.FailureResponse(
                "Dịch vụ AI Mentor hiện tại đang bảo trì hoặc chưa sẵn sàng. Vui lòng thử lại sau.", 
                new List<string> { ex.Message }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi bất ngờ khi xử lý chat Mentor cho Course {CourseId}", courseId);
            return StatusCode(500, ApiResponse<MentorChatResponseDto>.FailureResponse(
                "Đã có lỗi xảy ra khi trò chuyện với AI Mentor.", 
                new List<string> { ex.Message }));
        }
    }

    /// <summary>
    /// Học viên đặt câu hỏi với AI Mentor dạng Server-Sent Events (SSE) streaming theo thời gian thực
    /// </summary>
    [HttpPost("mentor-chat/stream")]
    public async Task StreamWithMentor(
        int courseId,
        [FromBody] MentorChatRequestDto request,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            Response.StatusCode = 401;
            return;
        }

        if (string.IsNullOrWhiteSpace(request?.Message))
        {
            Response.StatusCode = 400;
            return;
        }

        var hasAccess = await CanAccessCourseAsync(courseId, userId.Value, ct);
        if (!hasAccess)
        {
            Response.StatusCode = 403;
            return;
        }

        Response.ContentType = "text/event-stream; charset=utf-8";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        try
        {
            await _mentorChatService.StreamQuestionToResponseAsync(courseId, request, Response.Body, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi stream chat Mentor cho Course {CourseId}", courseId);
            var errPayload = JsonSerializer.Serialize(new { error = ex.Message });
            var errBytes = Encoding.UTF8.GetBytes($"event: error\ndata: {errPayload}\n\n");
            await Response.Body.WriteAsync(errBytes, ct);
            await Response.Body.FlushAsync(ct);
        }
    }

    /// <summary>
    /// Upload tài liệu khóa học (PDF, TXT, MD) và tự động lập chỉ mục RAG vào MentorChat
    /// </summary>
    [HttpPost("materials/upload")]
    [Authorize(Roles = "Instructor,Admin")]
    [RequestSizeLimit(100 * 1024 * 1024)] // 100 MB
    public async Task<ActionResult<ApiResponse<object>>> UploadDocumentMaterial(
        int courseId,
        IFormFile file,
        [FromForm] string? title,
        [FromForm] int? lessonId,
        [FromForm] string? description,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.FailureResponse("Vui lòng đăng nhập."));

        if (!await CanManageCourseAsync(courseId, userId.Value, ct))
            return Forbid();

        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.FailureResponse("Vui lòng chọn file tài liệu."));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExts = new[] { ".pdf", ".txt", ".md" };
        if (!allowedExts.Contains(ext))
            return BadRequest(ApiResponse<object>.FailureResponse("Hệ thống chỉ hỗ trợ tài liệu định dạng PDF, TXT hoặc MD."));

        // Kiểm tra lessonId nếu có
        if (lessonId.HasValue)
        {
            var lessonExists = await _db.Lessons.AnyAsync(l => l.LessonId == lessonId.Value && l.CourseId == courseId, ct);
            if (!lessonExists)
                return BadRequest(ApiResponse<object>.FailureResponse("Bài học không tồn tại trong khóa học này."));
        }

        // 1. Upload tài liệu lên Cloudflare R2
        string fileUrl;
        var folder = $"courses/{courseId}/materials";
        var mimeType = ext switch
        {
            ".pdf" => "application/pdf",
            ".txt" => "text/plain",
            ".md" => "text/markdown",
            _ => "application/octet-stream"
        };

        await using (var fileStream = file.OpenReadStream())
        {
            fileUrl = await _r2.UploadAsync(fileStream, file.FileName, mimeType, folder);
        }

        // 2. Lưu thông tin CourseMaterial vào Database
        var materialTitle = !string.IsNullOrWhiteSpace(title) ? title.Trim() : file.FileName;
        var material = new CourseMaterial
        {
            CourseId = courseId,
            LessonId = lessonId,
            UploaderId = userId.Value,
            Title = materialTitle,
            MaterialType = MaterialType.DOCUMENT,
            FileUrl = fileUrl,
            Description = description,
            CreatedAt = DateTime.UtcNow
        };
        _db.CourseMaterials.Add(material);
        await _db.SaveChangesAsync(ct);

        // 3. Gửi sang MentorChat để tách đoạn và lập chỉ mục Vector Qdrant
        MentorIngestResponseDto? ingestResult = null;
        try
        {
            await using var ingestStream = file.OpenReadStream();
            ingestResult = await _mentorChatService.IngestDocumentAsync(
                courseId, 
                file.FileName, 
                ingestStream, 
                lessonId, 
                materialId: material.MaterialId,
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tài liệu đã được lưu nhưng không thể lập chỉ mục MentorChat ngay lập tức.");
        }

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            materialId = material.MaterialId,
            courseId = material.CourseId,
            lessonId = material.LessonId,
            title = material.Title,
            fileUrl = material.FileUrl,
            materialType = material.MaterialType.ToString(),
            indexedChunks = ingestResult?.TotalChunks ?? 0,
            ragStatus = ingestResult != null ? "INDEXED" : "PENDING_INDEX"
        }, "Tải lên và lập chỉ mục tài liệu thành công."));
    }

    /// <summary>
    /// Xóa tài liệu khóa học và tự động dọn dẹp vector trong Qdrant Vector Store (Lifecycle Sync)
    /// </summary>
    [HttpDelete("materials/{materialId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteMaterial(
        int courseId,
        int materialId,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.FailureResponse("Vui lòng đăng nhập."));

        if (!await CanManageCourseAsync(courseId, userId.Value, ct))
            return Forbid();

        var material = await _db.CourseMaterials
            .FirstOrDefaultAsync(m => m.MaterialId == materialId && m.CourseId == courseId, ct);

        if (material == null)
            return NotFound(ApiResponse<object>.FailureResponse("Không tìm thấy tài liệu."));

        // 1. Xóa file trên Cloudflare R2 nếu có
        var key = material.ObjectKey ?? _r2.ExtractKeyFromUrl(material.FileUrl ?? string.Empty);
        if (!string.IsNullOrWhiteSpace(key))
        {
            try
            {
                await _r2.DeleteAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Không thể xóa file tài liệu {ObjectKey} trên R2.", key);
            }
        }

        // 2. Dọn dẹp vector trong Qdrant Vector Store
        try
        {
            await _mentorChatService.DeleteKnowledgeAsync(courseId, materialId: materialId, sourceType: "document", ct: ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Lỗi khi gọi dọn dẹp vector cho MaterialId {MaterialId}", materialId);
        }

        // 3. Xóa bản ghi trong Database
        _db.CourseMaterials.Remove(material);
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            materialId,
            courseId,
            deleted = true
        }, "Đã xóa tài liệu và dọn dẹp vector kiến thức thành công."));
    }

    /// <summary>
    /// Đồng bộ transcript của một bài học vào MentorChat AI
    /// </summary>
    [HttpPost("mentor-chat/sync-lesson/{lessonId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<MentorIngestResponseDto>>> SyncLessonTranscript(
        int courseId,
        int lessonId,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<MentorIngestResponseDto>.FailureResponse("Vui lòng đăng nhập."));

        if (!await CanManageCourseAsync(courseId, userId.Value, ct))
            return Forbid();

        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.LessonId == lessonId && l.CourseId == courseId, ct);
        if (lesson == null)
            return NotFound(ApiResponse<MentorIngestResponseDto>.FailureResponse("Không tìm thấy bài học."));

        if (string.IsNullOrWhiteSpace(lesson.Transcript))
            return BadRequest(ApiResponse<MentorIngestResponseDto>.FailureResponse("Bài học này chưa có transcript từ video."));

        try
        {
            var res = await _mentorChatService.IngestTranscriptAsync(
                courseId, 
                lesson.LessonId, 
                lesson.Title, 
                lesson.Transcript, 
                ct);

            return Ok(ApiResponse<MentorIngestResponseDto>.SuccessResponse(res!, "Đã đồng bộ transcript bài học vào AI Mentor."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi đồng bộ transcript bài học {LessonId} vào MentorChat", lessonId);
            return StatusCode(500, ApiResponse<MentorIngestResponseDto>.FailureResponse(
                "Không thể kết nối đến MentorChat AI để đồng bộ transcript.", 
                new List<string> { ex.Message }));
        }
    }

    /// <summary>
    /// Đồng bộ toàn bộ transcript các bài học đã có trong khóa vào MentorChat AI
    /// </summary>
    [HttpPost("mentor-chat/sync-course")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<SyncCourseTranscriptsResultDto>>> SyncAllLessons(
        int courseId,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<SyncCourseTranscriptsResultDto>.FailureResponse("Vui lòng đăng nhập."));

        if (!await CanManageCourseAsync(courseId, userId.Value, ct))
            return Forbid();

        var lessons = await _db.Lessons.AsNoTracking()
            .Where(l => l.CourseId == courseId && !string.IsNullOrEmpty(l.Transcript))
            .OrderBy(l => l.OrderIndex)
            .ToListAsync(ct);

        var result = new SyncCourseTranscriptsResultDto
        {
            TotalLessonsProcessed = lessons.Count
        };

        if (lessons.Count == 0)
        {
            result.Messages.Add("Khóa học hiện chưa có bài học nào có transcript.");
            return Ok(ApiResponse<SyncCourseTranscriptsResultDto>.SuccessResponse(result));
        }

        foreach (var l in lessons)
        {
            try
            {
                var ingest = await _mentorChatService.IngestTranscriptAsync(
                    courseId, 
                    l.LessonId, 
                    l.Title, 
                    l.Transcript!, 
                    ct);

                result.TotalSuccess++;
                result.Messages.Add($"Bài '{l.Title}' (ID {l.LessonId}): Đã lập chỉ mục {ingest?.TotalChunks ?? 0} đoạn.");
            }
            catch (Exception ex)
            {
                result.TotalSkipped++;
                result.Messages.Add($"Bài '{l.Title}' (ID {l.LessonId}) thất bại: {ex.Message}");
            }
        }

        return Ok(ApiResponse<SyncCourseTranscriptsResultDto>.SuccessResponse(
            result, 
            $"Đã đồng bộ {result.TotalSuccess}/{result.TotalLessonsProcessed} bài học vào AI Mentor."));
    }
}
