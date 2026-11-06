using Microsoft.EntityFrameworkCore;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class LessonsController : ControllerBase
{
    private readonly ILessonService _lessonService;
    private readonly ILearningAccessService _access;
    private readonly ICourseLearningAccessService _courseAccess;
    private readonly MC_BE.Shared.Data.SmartMcDbContext _db;

    public LessonsController(
        ILessonService lessonService,
        ILearningAccessService access,
        ICourseLearningAccessService courseAccess,
        MC_BE.Shared.Data.SmartMcDbContext db)
    {
        _lessonService = lessonService;
        _access = access;
        _courseAccess = courseAccess;
        _db = db;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;

        return int.TryParse(claim, out var id) ? id : null;
    }

    // GET /api/courses/{courseId}/lessons
    [HttpGet("courses/{courseId:int}/lessons")]
    public async Task<ActionResult<ApiResponse<List<LessonDto>>>> GetLessons(int courseId)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized(ApiResponse<List<LessonDto>>.FailureResponse("Unauthorized."));

        // Kiểm tra khóa học tồn tại và xác định giảng viên sở hữu khóa học.
        var course = await _db.Courses
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CourseId == courseId);

        if (course == null)
            return NotFound(ApiResponse<List<LessonDto>>.FailureResponse("Không tìm thấy khóa học."));

        var isAdmin = User.IsInRole("Admin");
        var isOwnerInstructor = User.IsInRole("Instructor") && course.InstructorId == userId.Value;

        // Quản trị viên và giảng viên sở hữu khóa học được xem toàn bộ bài học.
        if (isAdmin || isOwnerInstructor)
        {
            var staffLessons = await _lessonService.GetLessonsByCourseIdAsync(courseId);
            return Ok(ApiResponse<List<LessonDto>>.SuccessResponse(staffLessons));
        }

        // Kiểm tra quyền truy cập khóa học trước khi lấy danh sách bài học.
        if (!await _courseAccess.CanAccessCourseAsync(courseId, userId.Value, isAdmin: false))
            return Forbid();

        var lessons = await _lessonService.GetLessonsByCourseIdAsync(courseId);

        // Kiểm tra quyền truy cập từng bài học theo tiến độ học tập.
        var locks = await _access.GetLessonLocksAsync(userId.Value, courseId);

        foreach (var lesson in lessons)
        {
            lesson.IsLocked =
                !locks.TryGetValue(lesson.LessonId, out var reason) || reason != null;

            lesson.LockReason = lesson.IsLocked
                ? reason ?? "Bài học hiện chưa khả dụng."
                : null;

            // Không trả đường dẫn video của bài học đang bị khóa.
            if (lesson.IsLocked)
                lesson.VideoUrl = null;
        }

        // Giữ nguyên định hướng bảo mật từ nhánh còn lại:
        // Chỉ ẩn URL Drive/YouTube công khai sau khi video học viên
        // đã được chuyển sang R2 riêng tư và luồng phát tương thích.
        // Không bật đoạn ẩn URL tại đây vì video cũ vẫn có thể dùng Drive/YouTube.

        return Ok(ApiResponse<List<LessonDto>>.SuccessResponse(lessons));
    }

    // POST /api/courses/{courseId}/lessons
    [HttpPost("courses/{courseId:int}/lessons")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<LessonDto>>> CreateLesson(
        int courseId,
        [FromBody] CreateLessonRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();

            return BadRequest(ApiResponse<LessonDto>.FailureResponse("Validation failed.", errors));
        }

        var instructorId = GetCurrentUserId();

        if (instructorId is null)
            return Unauthorized(ApiResponse<LessonDto>.FailureResponse("Unauthorized."));

        var created = await _lessonService.CreateLessonAsync(courseId, instructorId.Value, request);

        if (created is null)
            return BadRequest(ApiResponse<LessonDto>.FailureResponse("Course not found or creation failed."));

        return Ok(ApiResponse<LessonDto>.SuccessResponse(created, "Lesson created successfully."));
    }

    // POST /api/courses/{courseId}/lessons/bulk
    [HttpPost("courses/{courseId:int}/lessons/bulk")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<List<LessonDto>>>> CreateLessonsBulk(
        int courseId,
        [FromBody] List<CreateLessonRequest> requests)
    {
        if (requests == null || !requests.Any())
            return BadRequest(ApiResponse<List<LessonDto>>.FailureResponse("No lesson data provided."));

        var instructorId = GetCurrentUserId();

        if (instructorId is null)
            return Unauthorized(ApiResponse<List<LessonDto>>.FailureResponse("Unauthorized."));

        var results = await _lessonService.CreateLessonsBulkAsync(courseId, instructorId.Value, requests);

        return Ok(ApiResponse<List<LessonDto>>.SuccessResponse(
            results,
            $"Successfully imported {results.Count} lessons."));
    }

    // PUT /api/lessons/{id}
    [HttpPut("lessons/{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<LessonDto>>> UpdateLesson(
        int id,
        [FromBody] UpdateLessonRequest request)
    {
        var instructorId = GetCurrentUserId();

        if (instructorId is null)
            return Unauthorized(ApiResponse<LessonDto>.FailureResponse("Unauthorized."));

        var updated = await _lessonService.UpdateLessonAsync(id, instructorId.Value, request);

        if (updated is null)
            return NotFound(ApiResponse<LessonDto>.FailureResponse("Lesson not found or you are not the owner."));

        return Ok(ApiResponse<LessonDto>.SuccessResponse(updated, "Lesson updated successfully."));
    }

    // DELETE /api/lessons/{id}
    [HttpDelete("lessons/{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteLesson(int id)
    {
        var instructorId = GetCurrentUserId();

        if (instructorId is null)
            return Unauthorized(ApiResponse<string>.FailureResponse("Unauthorized."));

        var deleted = await _lessonService.DeleteLessonAsync(id, instructorId.Value);

        if (!deleted)
            return NotFound(ApiResponse<string>.FailureResponse("Lesson not found or you are not the owner."));

        return Ok(ApiResponse<string>.SuccessResponse("Deleted", "Lesson deleted successfully."));
    }

    // POST /api/lessons/{id}/upload-video  — multipart/form-data
    // POST /api/courses/{courseId}/video-upload-sessions — presigned R2 upload setup
    [HttpPost("courses/{courseId:int}/video-upload-sessions")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<List<VideoUploadSessionDto>>>> CreateVideoUploadSessions(
        int courseId,
        [FromBody] CreateVideoUploadSessionsRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<List<VideoUploadSessionDto>>.FailureResponse("Unauthorized."));
        if (request.Files is null || request.Files.Count == 0 || request.Files.Count > 30)
            return BadRequest(ApiResponse<List<VideoUploadSessionDto>>.FailureResponse("Chọn từ 1 đến 30 video cho mỗi đợt tải."));

        try
        {
            var sessions = await _lessonService.CreateVideoUploadSessionsAsync(courseId, instructorId.Value, request);
            return Ok(ApiResponse<List<VideoUploadSessionDto>>.SuccessResponse(sessions, "Upload sessions created."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<List<VideoUploadSessionDto>>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("courses/{courseId:int}/video-upload-sessions/{sessionId:guid}/complete")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<LessonDto>>> CompleteVideoUploadSession(
        int courseId,
        Guid sessionId)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<LessonDto>.FailureResponse("Unauthorized."));

        try
        {
            var lesson = await _lessonService.CompleteVideoUploadSessionAsync(courseId, sessionId, instructorId.Value);
            if (lesson is null)
                return NotFound(ApiResponse<LessonDto>.FailureResponse("Upload session not found or no longer valid."));
            return Ok(ApiResponse<LessonDto>.SuccessResponse(lesson, "Video uploaded and attached to the lesson."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<LessonDto>.FailureResponse(ex.Message));
        }
    }

    // POST /api/lessons/{id}/upload-video  — legacy multipart/form-data upload
    [HttpPost("lessons/{id:int}/upload-video")]
    [Authorize(Roles = "Instructor")]
    [RequestSizeLimit(500 * 1024 * 1024)] // 500 MB
    [RequestFormLimits(MultipartBodyLengthLimit = 500 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<LessonDto>>> UploadVideo(int id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<LessonDto>.FailureResponse("No file provided."));

        // Basic MIME validation — allow common video formats.
        var allowedTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska",
            "video/mpeg"
        };

        if (!allowedTypes.Contains(file.ContentType))
        {
            return BadRequest(ApiResponse<LessonDto>.FailureResponse(
                $"File type '{file.ContentType}' is not supported. Please upload a video file (mp4, webm, mov, avi, mkv)."));
        }

        var instructorId = GetCurrentUserId();

        if (instructorId is null)
            return Unauthorized(ApiResponse<LessonDto>.FailureResponse("Unauthorized."));

        var updated = await _lessonService.UploadVideoAsync(id, instructorId.Value, file);

        if (updated is null)
            return NotFound(ApiResponse<LessonDto>.FailureResponse("Lesson not found or you are not the owner."));

        return Ok(ApiResponse<LessonDto>.SuccessResponse(updated, "Video uploaded successfully."));
    }

    [HttpGet("lessons/{id:int}/playback")]
    public async Task<ActionResult<ApiResponse<LessonPlaybackDto>>> GetPlayback(int id)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
            return Unauthorized(ApiResponse<LessonPlaybackDto>.FailureResponse("Unauthorized."));

        var playback = await _lessonService.GetPlaybackAsync(
            id,
            userId.Value,
            User.IsInRole("Admin"));

        if (playback is null)
            return NotFound(ApiResponse<LessonPlaybackDto>.FailureResponse("Lesson or playback access not found."));

        return Ok(ApiResponse<LessonPlaybackDto>.SuccessResponse(playback, "Playback URL issued."));
    }

    // DELETE /api/lessons/{id}/video — remove video from R2 + DB
    [HttpDelete("lessons/{id:int}/video")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteVideo(int id)
    {
        var instructorId = GetCurrentUserId();

        if (instructorId is null)
            return Unauthorized(ApiResponse<string>.FailureResponse("Unauthorized."));

        var deleted = await _lessonService.DeleteVideoAsync(id, instructorId.Value);

        if (!deleted)
        {
            return NotFound(ApiResponse<string>.FailureResponse(
                "Lesson not found, no video attached, or you are not the owner."));
        }

        return Ok(ApiResponse<string>.SuccessResponse("Deleted", "Video removed successfully."));
    }
}
