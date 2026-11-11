using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.VoiceAssessment.DTOs;
using MC_BE.Features.VoiceAssessment.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.VoiceAssessment.Controllers;

[ApiController, Authorize]
[Route("api/voice-assessment/practices")]
public sealed class AIPracticeController : ControllerBase
{
    private readonly SmartMcDbContext _db;
    private readonly ICloudinaryService _storage;
    private readonly IAIPracticeService _ai;
    private readonly ILogger<AIPracticeController> _logger;
    private const long MaxBytes = 20 * 1024 * 1024;
    public AIPracticeController(SmartMcDbContext db, ICloudinaryService storage,
        IAIPracticeService ai, ILogger<AIPracticeController> logger)
    { _db = db; _storage = storage; _ai = ai; _logger = logger; }
    private int UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpPost("free"), RequestSizeLimit(MaxBytes + 65536)]
    public Task<IActionResult> Free([FromForm] AIPracticeUploadRequest request, CancellationToken ct)
        => Create(request, null, null, ct);

    [HttpPost("courses/{courseId:int}/lessons/{lessonId:int}"), RequestSizeLimit(MaxBytes + 65536)]
    public Task<IActionResult> Course(int courseId, int lessonId,
        [FromForm] AIPracticeUploadRequest request, CancellationToken ct)
        => Create(request, courseId, lessonId, ct);

    private async Task<IActionResult> Create(AIPracticeUploadRequest request,
        int? courseId, int? lessonId, CancellationToken ct)
    {
        if (UserId <= 0) return Unauthorized();
        if (request.AudioFile == null || request.AudioFile.Length == 0 || request.AudioFile.Length > MaxBytes)
            return BadRequest(new { message = "Tệp âm thanh trống hoặc vượt quá 20 MB." });
        var extension = Path.GetExtension(request.AudioFile.FileName).ToLowerInvariant();
        if (extension != ".wav" && extension != ".flac")
            return BadRequest(new { message = "Chỉ hỗ trợ WAV/FLAC. Âm thanh phải phù hợp định dạng V4-B." });
        if (courseId.HasValue)
        {
            var lesson = await _db.Lessons.AsNoTracking().FirstOrDefaultAsync(
                x => x.LessonId == lessonId && x.CourseId == courseId, ct);
            if (lesson == null || !string.Equals(lesson.LessonType.ToString(), "ASSIGNMENT", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { message = "Không tìm thấy bài tập phù hợp." });
            if (!string.Equals(lesson.Status.ToString(), "ACTIVE", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { message = "Bài học chưa được kích hoạt." });
            var enrolled = await _db.Enrollments.AsNoTracking().AnyAsync(
                x => x.LearnerId == UserId && x.CourseId == courseId &&
                     x.Status == "ACTIVE" &&
                     (!x.ExpiresAt.HasValue || x.ExpiresAt.Value > DateTime.UtcNow), ct);
            if (!enrolled) return StatusCode(403, new { message = "Bạn chưa có quyền truy cập khóa học hoặc đăng ký đã hết hạn." });
        }

byte[] bytes;
AIPracticeSession? session = null;
string currentStep = "READ_AUDIO";

try
{
    // Bước 1: Đọc file âm thanh
    await using (var stream = new MemoryStream())
    {
        await request.AudioFile.CopyToAsync(stream, ct);
        bytes = stream.ToArray();
    }

    _logger.LogInformation(
        "[AI PRACTICE] READ_AUDIO OK. UserId={UserId}, Size={Size}",
        UserId, bytes.Length
    );

    // Bước 2: Upload lên Cloudinary
    currentStep = "UPLOAD_CLOUDINARY";

    var uploaded = await _storage.UploadVideoAsync(
        request.AudioFile,
        "ai_practices"
    );

    var url = uploaded?.SecureUrl?.ToString();

    if (string.IsNullOrWhiteSpace(url))
    {
        throw new InvalidOperationException(
            "Cloudinary không trả về SecureUrl."
        );
    }

    _logger.LogInformation(
        "[AI PRACTICE] UPLOAD_CLOUDINARY OK"
    );

    // Bước 3: Tạo phiên luyện tập
    currentStep = "SAVE_DATABASE";

    session = new AIPracticeSession
    {
        LearnerId = UserId,
        CourseId = courseId,
        LessonId = lessonId,
        PracticeMode = courseId.HasValue ? "COURSE" : "FREE",
        AudioUrl = url,
        ExpectedText = request.ExpectedText?.Trim()
    };

    _db.Set<AIPracticeSession>().Add(session);


try
{
    await _db.SaveChangesAsync(ct);
}
catch (DbUpdateException ex)
{
    _logger.LogError(
        ex,
        "[AI PRACTICE] DATABASE ERROR. InnerException={InnerException}",
        ex.InnerException?.Message
    );

    throw;
}


    _logger.LogInformation(
        "[AI PRACTICE] SAVE_DATABASE OK. SessionId={SessionId}",
        session.PracticeSessionId
    );

    // Bước 4: Phân tích bằng AI
    currentStep = "ANALYZE_V4B_LLM";

    var result = await _ai.AnalyzeAsync(
        session.PracticeSessionId,
        UserId,
        bytes,
        extension,
        ct
    );

    _logger.LogInformation(
        "[AI PRACTICE] ANALYZE OK. SessionId={SessionId}",
        session.PracticeSessionId
    );

    return Ok(result);
}
catch (OperationCanceledException) when (ct.IsCancellationRequested)
{
    throw;
}
catch (Exception ex)
{
    _logger.LogError(
        ex,
        "[AI PRACTICE] FAILED. Step={Step}, UserId={UserId}, " +
        "CourseId={CourseId}, LessonId={LessonId}, SessionId={SessionId}",
        currentStep,
        UserId,
        courseId,
        lessonId,
        session?.PracticeSessionId
    );

    return StatusCode(502, new
    {
        message = "Không thể xử lý phiên luyện tập AI.",
        failedStep = currentStep,
        practiceSessionId = session?.PracticeSessionId
    });
}

    }

    [HttpGet("me")]
    public async Task<IActionResult> Mine([FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (UserId <= 0) return Unauthorized();
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        return Ok(await _db.Set<AIPracticeSession>().AsNoTracking()
            .Where(x => x.LearnerId == UserId).OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new { x.PracticeSessionId, x.PracticeMode, x.CourseId, x.LessonId,
                x.Status, x.CreatedAt }).ToListAsync(ct));
    }

    [HttpGet("{practiceSessionId:int}")]
    public async Task<IActionResult> Detail(int practiceSessionId, CancellationToken ct)
    {
        if (UserId <= 0) return Unauthorized();
        var own = await _db.Set<AIPracticeSession>().AsNoTracking().AnyAsync(
            x => x.PracticeSessionId == practiceSessionId && x.LearnerId == UserId, ct);
        if (!own) return NotFound();
        try { return Ok(await _ai.GetAsync(practiceSessionId, ct)); }
        catch (KeyNotFoundException) { return NotFound(new { message = "Chưa có kết quả AI." }); }
    }

    [HttpGet("instructor/courses/{courseId:int}")]
    public async Task<IActionResult> InstructorCourse(int courseId, [FromQuery] int? lessonId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        if (UserId <= 0) return Unauthorized();
        var owns = await _db.Courses.AsNoTracking().AnyAsync(
            x => x.CourseId == courseId && x.InstructorId == UserId, ct);
        if (!owns) return NotFound();
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Set<AIPracticeSession>().AsNoTracking()
            .Where(x => x.PracticeMode == "COURSE" && x.CourseId == courseId);
        if (lessonId.HasValue) query = query.Where(x => x.LessonId == lessonId.Value);
        return Ok(await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new { x.PracticeSessionId, x.LearnerId, x.LessonId,
                x.Status, x.CreatedAt }).ToListAsync(ct));
    }

    [HttpGet("instructor/{practiceSessionId:int}")]
    public async Task<IActionResult> InstructorDetail(int practiceSessionId, CancellationToken ct)
    {
        if (UserId <= 0) return Unauthorized();
        var allowed = await _db.Set<AIPracticeSession>().AsNoTracking().AnyAsync(
            x => x.PracticeSessionId == practiceSessionId && x.PracticeMode == "COURSE" &&
                x.CourseId.HasValue && _db.Courses.Any(c => c.CourseId == x.CourseId.Value && c.InstructorId == UserId), ct);
        if (!allowed) return NotFound();
        try { return Ok(await _ai.GetAsync(practiceSessionId, ct)); }
        catch (KeyNotFoundException) { return NotFound(new { message = "Chưa có kết quả AI." }); }
    }
}
