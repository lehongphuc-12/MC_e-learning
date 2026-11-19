using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Features.VoiceJourney.Entities;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.VoiceJourney.Controllers;

[ApiController, Authorize(Roles = "Admin")]
[Route("api/admin/voice-coach")]
public sealed class VoiceCoachAdminController : ControllerBase
{
    private const long MaxVideoSizeBytes = 500L * 1024 * 1024;
    private const long MaxDocumentSizeBytes = 50L * 1024 * 1024;
    private static readonly string[] AllowedVideoExtensions = [".mp4", ".webm"];
    private static readonly string[] AllowedDocumentExtensions = [".pdf", ".docx"];

    private readonly SmartMcDbContext _db;
    private readonly IR2StorageService _r2Storage;

    public VoiceCoachAdminController(
        SmartMcDbContext db,
        IR2StorageService r2Storage)
    {
        _db = db;
        _r2Storage = r2Storage;
    }

    /// <summary>
    /// Uploads a lesson video to Cloudflare R2 and returns its public URL.
    /// The lesson can then be created with the returned VideoUrl.
    /// </summary>
    [HttpPost("videos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxVideoSizeBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxVideoSizeBytes)]
    public async Task<IActionResult> UploadLessonVideo(
        IFormFile? file,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn video cần tải lên." });

        if (file.Length > MaxVideoSizeBytes)
            return BadRequest(new { message = "Video không được vượt quá 500 MB." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedVideoExtensions.Contains(extension))
            return BadRequest(new { message = "Chỉ chấp nhận video định dạng MP4 hoặc WEBM." });

        var contentType = extension switch
        {
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            _ => "application/octet-stream"
        };

        // Không tin ContentType do client gửi lên; xác định MIME theo phần mở rộng đã cho phép.
        await using var stream = file.OpenReadStream();
        var videoUrl = await _r2Storage.UploadAsync(
            stream,
            Path.GetFileName(file.FileName),
            contentType,
            "voice-journey/lessons");

        return Ok(new
        {
            videoUrl,
            fileName = Path.GetFileName(file.FileName),
            fileSize = file.Length,
            contentType
        });
    }

    /// <summary>
    /// Uploads a lesson document (PDF/DOCX) to Cloudflare R2 and returns its public URL.
    /// </summary>
    [HttpPost("documents")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxDocumentSizeBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxDocumentSizeBytes)]
    public async Task<IActionResult> UploadLessonDocument(
        IFormFile? file,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn tài liệu cần tải lên." });

        if (file.Length > MaxDocumentSizeBytes)
            return BadRequest(new { message = "Tài liệu không được vượt quá 50 MB." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedDocumentExtensions.Contains(extension))
            return BadRequest(new { message = "Chỉ chấp nhận tài liệu PDF hoặc DOCX." });

        var contentType = extension == ".pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        await using var stream = file.OpenReadStream();
        var documentUrl = await _r2Storage.UploadAsync(
            stream,
            Path.GetFileName(file.FileName),
            contentType,
            "voice-journey/documents");

        return Ok(new
        {
            documentUrl,
            fileName = Path.GetFileName(file.FileName),
            fileSize = file.Length,
            contentType
        });
    }

    public sealed record SkillRequest(
        string SkillCode,
        string Name,
        string? Description,
        int DisplayOrder,
        bool IsActive = true);

    [HttpPost("skills")]
    public async Task<IActionResult> CreateSkill(
        SkillRequest r,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.SkillCode) ||
            string.IsNullOrWhiteSpace(r.Name) ||
            r.SkillCode.Length > 40 ||
            r.Name.Length > 120)
            return BadRequest();

        var e = new VoiceSkill
        {
            SkillCode = r.SkillCode.Trim().ToUpperInvariant(),
            Name = r.Name.Trim(),
            Description = r.Description,
            DisplayOrder = r.DisplayOrder,
            IsActive = r.IsActive
        };

        _db.VoiceSkills.Add(e);
        await _db.SaveChangesAsync(ct);

        return Ok(e);
    }

    [HttpPut("skills/{id:int}")]
    public async Task<IActionResult> UpdateSkill(
        int id,
        SkillRequest r,
        CancellationToken ct)
    {
        var e = await _db.VoiceSkills.FindAsync(
            new object[] { id }, ct);

        if (e == null)
            return NotFound();

        e.SkillCode = r.SkillCode.Trim().ToUpperInvariant();
        e.Name = r.Name.Trim();
        e.Description = r.Description;
        e.DisplayOrder = r.DisplayOrder;
        e.IsActive = r.IsActive;

        await _db.SaveChangesAsync(ct);

        return Ok(e);
    }

    [HttpDelete("skills/{id:int}")]
    public async Task<IActionResult> DeleteSkill(int id, CancellationToken ct)
    {
        var skill = await _db.VoiceSkills.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (skill == null) return NotFound();
        var inUse = await _db.VoiceLessons.AnyAsync(x => x.SkillId == id, ct)
            || await _db.VoiceSkillModelMappings.AnyAsync(x => x.SkillId == id, ct);
        if (inUse) return Conflict(new { message = "Kỹ năng đang được bài học hoặc Model Mapping sử dụng. Hãy tắt kỹ năng thay vì xóa." });
        _db.VoiceSkills.Remove(skill);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Đã xóa kỹ năng." });
    }

    [HttpGet("skills")]
    public async Task<IActionResult> Skills(
        CancellationToken ct)
    {
        return Ok(await _db.VoiceSkills
            .AsNoTracking()
            .OrderBy(x => x.DisplayOrder)
            .ToListAsync(ct));
    }

    public sealed record LessonRequest(
        int SkillId,
        string Title,
        string Description,
        string Difficulty,
        int DurationMinutes,
        string? VideoUrl,
        string? DocumentUrl,
        string? DocumentTitle,
        string? ModelLabel,
        string ModelSignalDirection,
        bool IsPublished,
        int DisplayOrder);

    [HttpPost("lessons")]
    public async Task<IActionResult> CreateLesson(
        LessonRequest r,
        CancellationToken ct)
    {
        if (!await _db.VoiceSkills.AnyAsync(
            x => x.Id == r.SkillId, ct))
        {
            return BadRequest(new
            {
                message = "Tiêu chí không tồn tại."
            });
        }

        if (string.IsNullOrWhiteSpace(r.Title) ||
            r.Title.Length > 200 ||
            r.DurationMinutes is < 1 or > 240)
            return BadRequest();

        if (!new[]
            {
                "UNKNOWN",
                "HIGHER_IS_WORSE",
                "LOWER_IS_WORSE"
            }.Contains(r.ModelSignalDirection))
        {
            return BadRequest(new
            {
                message = "Chiều tín hiệu không hợp lệ."
            });
        }

        var e = new VoiceLesson
        {
            SkillId = r.SkillId,
            Title = r.Title.Trim(),
            Description = r.Description ?? "",
            Difficulty = r.Difficulty,
            DurationMinutes = r.DurationMinutes,
            VideoUrl = r.VideoUrl,
            DocumentUrl = r.DocumentUrl,
            DocumentTitle = r.DocumentTitle,
            ModelLabel = r.ModelLabel,
            ModelSignalDirection = r.ModelSignalDirection,
            IsPublished = r.IsPublished,
            DisplayOrder = r.DisplayOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.VoiceLessons.Add(e);
        await _db.SaveChangesAsync(ct);

        return Ok(e);
    }

    [HttpPut("lessons/{id:int}")]
    public async Task<IActionResult> UpdateLesson(
        int id,
        LessonRequest r,
        CancellationToken ct)
    {
        var e = await _db.VoiceLessons.FindAsync(
            new object[] { id }, ct);

        if (e == null)
            return NotFound();

        if (!await _db.VoiceSkills.AnyAsync(
            x => x.Id == r.SkillId, ct))
            return BadRequest();

        e.SkillId = r.SkillId;
        e.Title = r.Title.Trim();
        e.Description = r.Description ?? "";
        e.Difficulty = r.Difficulty;
        e.DurationMinutes = r.DurationMinutes;
        e.VideoUrl = r.VideoUrl;
        e.DocumentUrl = r.DocumentUrl;
        e.DocumentTitle = r.DocumentTitle;
        e.ModelLabel = r.ModelLabel;
        e.ModelSignalDirection = r.ModelSignalDirection;
        e.IsPublished = r.IsPublished;
        e.DisplayOrder = r.DisplayOrder;
        e.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(e);
    }

    [HttpDelete("lessons/{id:int}")]
    public async Task<IActionResult> DeleteLesson(int id, CancellationToken ct)
    {
        var lesson = await _db.VoiceLessons.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (lesson == null) return NotFound();
        var exerciseIds = await _db.VoiceExercises.Where(x => x.LessonId == id)
            .Select(x => x.Id).ToListAsync(ct);
        if (await _db.VoiceExerciseAttempts.AnyAsync(x => exerciseIds.Contains(x.ExerciseId), ct))
            return Conflict(new { message = "Bài học đã có lịch sử luyện tập; hãy gỡ xuất bản để bảo toàn dữ liệu." });
        _db.VoiceExercises.RemoveRange(_db.VoiceExercises.Where(x => x.LessonId == id));
        _db.VoiceLessons.Remove(lesson);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Đã xóa bài học." });
    }

    [HttpGet("lessons")]
    public async Task<IActionResult> Lessons(
        CancellationToken ct)
    {
        return Ok(await _db.VoiceLessons
            .AsNoTracking()
            .OrderBy(x => x.DisplayOrder)
            .ToListAsync(ct));
    }

    public sealed record ExerciseRequest(
        int LessonId,
        string Title,
        string ExerciseType,
        string Instructions,
        string? PracticeText,
        int DisplayOrder,
        bool IsActive = true);

    [HttpPost("exercises")]
    public async Task<IActionResult> CreateExercise(
        ExerciseRequest r,
        CancellationToken ct)
    {
        if (!await _db.VoiceLessons.AnyAsync(
            x => x.Id == r.LessonId, ct))
        {
            return BadRequest(new
            {
                message = "Bài học không tồn tại."
            });
        }

        if (string.IsNullOrWhiteSpace(r.Title) ||
            string.IsNullOrWhiteSpace(r.Instructions))
            return BadRequest();

        var e = new VoiceExercise
        {
            LessonId = r.LessonId,
            Title = r.Title.Trim(),
            ExerciseType = r.ExerciseType,
            Instructions = r.Instructions,
            PracticeText = r.PracticeText,
            DisplayOrder = r.DisplayOrder,
            IsActive = r.IsActive
        };

        _db.VoiceExercises.Add(e);
        await _db.SaveChangesAsync(ct);

        return Ok(e);
    }

    [HttpPut("exercises/{id:int}")]
    public async Task<IActionResult> UpdateExercise(
        int id,
        ExerciseRequest r,
        CancellationToken ct)
    {
        var e = await _db.VoiceExercises.FindAsync(
            new object[] { id }, ct);

        if (e == null)
            return NotFound();

        if (!await _db.VoiceLessons.AnyAsync(
            x => x.Id == r.LessonId, ct))
            return BadRequest();

        e.LessonId = r.LessonId;
        e.Title = r.Title.Trim();
        e.ExerciseType = r.ExerciseType;
        e.Instructions = r.Instructions;
        e.PracticeText = r.PracticeText;
        e.DisplayOrder = r.DisplayOrder;
        e.IsActive = r.IsActive;

        await _db.SaveChangesAsync(ct);

        return Ok(e);
    }


    [HttpDelete("exercises/{id:int}")]
    public async Task<IActionResult> DeleteExercise(int id, CancellationToken ct)
    {
        var exercise = await _db.VoiceExercises.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (exercise == null) return NotFound();
        if (await _db.VoiceExerciseAttempts.AnyAsync(x => x.ExerciseId == id, ct))
        {
            exercise.IsActive = false;
            await _db.SaveChangesAsync(ct);
            return Ok(new { message = "Bài tập có lịch sử luyện nên đã được ngừng hoạt động." });
        }
        _db.VoiceExercises.Remove(exercise);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Đã xóa bài tập." });
    }

    [HttpGet("exercises")]
    public async Task<IActionResult> Exercises([FromQuery] int? lessonId, CancellationToken ct)
    {
        var query = _db.VoiceExercises.AsNoTracking().AsQueryable();
        if (lessonId.HasValue) query = query.Where(x => x.LessonId == lessonId.Value);
        return Ok(await query.OrderBy(x => x.LessonId)
            .ThenBy(x => x.DisplayOrder).ToListAsync(ct));
    }

    public sealed record MappingRequest(
        int SkillId,
        string ModelLabel,
        string SignalDirection,
        bool IsCalibrated,
        bool IsActive = true);

    [HttpPost("model-mappings")]
    public async Task<IActionResult> CreateMapping(
        MappingRequest r,
        CancellationToken ct)
    {
        if (!await _db.VoiceSkills.AnyAsync(
            x => x.Id == r.SkillId, ct))
            return BadRequest();

        if (!new[]
            {
                "UNKNOWN",
                "HIGHER_IS_WORSE",
                "LOWER_IS_WORSE"
            }.Contains(r.SignalDirection))
            return BadRequest();

        var e = new VoiceSkillModelMapping
        {
            SkillId = r.SkillId,
            ModelLabel = r.ModelLabel.Trim(),
            SignalDirection = r.SignalDirection,
            IsCalibrated = r.IsCalibrated,
            IsActive = r.IsActive
        };

        _db.VoiceSkillModelMappings.Add(e);
        await _db.SaveChangesAsync(ct);

        return Ok(e);
    }

    [HttpDelete("model-mappings/{id:int}")]
    public async Task<IActionResult> DeleteMapping(int id, CancellationToken ct)
    {
        var mapping = await _db.VoiceSkillModelMappings.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (mapping == null) return NotFound();
        _db.VoiceSkillModelMappings.Remove(mapping);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Đã xóa ánh xạ." });
    }

    [HttpGet("model-mappings")]
    public async Task<IActionResult> Mappings(
        CancellationToken ct)
    {
        return Ok(await _db.VoiceSkillModelMappings
            .AsNoTracking()
            .ToListAsync(ct));
    }

    [HttpPut("model-mappings/{id:int}")]
    public async Task<IActionResult> UpdateMapping(
        int id, MappingRequest r, CancellationToken ct)
    {
        var entity = await _db.VoiceSkillModelMappings
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity == null) return NotFound();

        if (!await _db.VoiceSkills.AnyAsync(x => x.Id == r.SkillId, ct))
            return BadRequest(new { message = "Tiêu chí không tồn tại." });

        if (string.IsNullOrWhiteSpace(r.ModelLabel) || r.ModelLabel.Length > 40 ||
            !new[] { "UNKNOWN", "HIGHER_IS_WORSE", "LOWER_IS_WORSE" }.Contains(r.SignalDirection))
            return BadRequest(new { message = "Thông tin ánh xạ không hợp lệ." });

        entity.SkillId = r.SkillId;
        entity.ModelLabel = r.ModelLabel.Trim();
        entity.SignalDirection = r.SignalDirection;
        entity.IsCalibrated = r.IsCalibrated;
        entity.IsActive = r.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(entity);
    }

}