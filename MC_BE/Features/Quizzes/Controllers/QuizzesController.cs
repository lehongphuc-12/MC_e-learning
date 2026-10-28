using MC_BE.Core.DTOs;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Features.Quizzes.DTOs;
using MC_BE.Features.Quizzes.Services.Interfaces;
using MC_BE.Features.Quizzes.Sync;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
namespace MC_BE.Features.Quizzes.Controllers;
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuizzesController : ControllerBase
{
    private readonly IQuizService _quizService;
    private readonly QuizSheetExporter _sheetExporter;
    private readonly ILogger<QuizzesController> _logger;
    private readonly ICloudinaryService _cloudinaryService;
    public QuizzesController(IQuizService quizService, QuizSheetExporter sheetExporter, ILogger<QuizzesController> logger, ICloudinaryService cloudinaryService)
    {
        _quizService = quizService;
        _sheetExporter = sheetExporter;
        _logger = logger;
        _cloudinaryService = cloudinaryService;
    }
    private async Task TrySyncSheetAsync(int quizId)
    {
        try { await _sheetExporter.ExportAsync(quizId, HttpContext.RequestAborted); Response.Headers["X-MSEEK-Sheets-Sync"] = "success"; }
        catch (Exception ex) { _logger.LogError(ex, "Google Sheets sync failed for quiz {QuizId}", quizId); Response.Headers["X-MSEEK-Sheets-Sync"] = "failed-retry-export"; }
    }
    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(
            ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id)
            ? id
            : null;
    }
[HttpGet("{id:int}")]
public async Task<ActionResult<ApiResponse<QuizDto>>> GetQuiz(int id)
{
    var quiz = await _quizService.GetQuizByIdAsync(id);
    if (quiz is null)
    {
        return NotFound(
            ApiResponse<QuizDto>.FailureResponse(
                $"Quiz with ID {id} not found."));
    }
    return Ok(
        ApiResponse<QuizDto>.SuccessResponse(
            quiz,
            "Quiz retrieved successfully."));
}
    [HttpPost]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<QuizDto>>> CreateQuiz(
        [FromBody] CreateQuizRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(
                ApiResponse<QuizDto>.FailureResponse(
                    "Validation failed.",
                    errors));
        }
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
        {
            return Unauthorized(
                ApiResponse<QuizDto>.FailureResponse(
                    "Unauthorized."));
        }
        try
        {
            var created = await _quizService.CreateQuizAsync(
                instructorId.Value,
                request);
            if (created is null)
            {
                return BadRequest(
                    ApiResponse<QuizDto>.FailureResponse(
                        "Unable to create quiz."));
            }
            await TrySyncSheetAsync(created.QuizId);
            return Created(
                $"/api/quizzes/{created.QuizId}",
                ApiResponse<QuizDto>.SuccessResponse(
                    created,
                    "Quiz created successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                ApiResponse<QuizDto>.FailureResponse(
                    ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(
                ApiResponse<QuizDto>.FailureResponse(
                    ex.Message));
        }
        catch
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                ApiResponse<QuizDto>.FailureResponse(
                    "Unable to create quiz. Please try again later."));
        }
    }
    [HttpPut("{quizId}")]
[Authorize(Roles = "Instructor")]
public async Task<ActionResult<ApiResponse<QuizDto>>> UpdateQuiz(
    int quizId,
    [FromBody] UpdateQuizRequest request)
{
    if (!ModelState.IsValid)
    {
        var errors = ModelState.Values
            .SelectMany(v => v.Errors)
            .Select(e => e.ErrorMessage)
            .ToList();
        return BadRequest(
            ApiResponse<QuizDto>.FailureResponse(
                "Validation failed.",
                errors));
    }
    var instructorId = GetCurrentUserId();
    if (instructorId is null)
    {
        return Unauthorized(
            ApiResponse<QuizDto>.FailureResponse(
                "Unauthorized."));
    }
    try
    {
        var updated = await _quizService.UpdateQuizAsync(
            instructorId.Value,
            quizId,
            request);
        if (updated is null)
        {
            return NotFound(
                ApiResponse<QuizDto>.FailureResponse(
                    "Quiz not found."));
        }
        await TrySyncSheetAsync(updated.QuizId);
        return Ok(
            ApiResponse<QuizDto>.SuccessResponse(
                updated,
                "Quiz updated successfully."));
    }
    catch (UnauthorizedAccessException ex)
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            ApiResponse<QuizDto>.FailureResponse(
                ex.Message));
    }
    catch (ArgumentException ex)
    {
        return BadRequest(
            ApiResponse<QuizDto>.FailureResponse(
                ex.Message));
    }
    catch
    {
        return StatusCode(
            StatusCodes.Status500InternalServerError,
            ApiResponse<QuizDto>.FailureResponse(
                "Unable to update quiz. Please try again later."));
    }
}
[HttpGet("{quizId}/take")]
[Authorize(Roles = "Learner")]
public async Task<ActionResult<ApiResponse<TakeQuizDto>>> TakeQuiz(
    int quizId)
{
    var learnerId = GetCurrentUserId();
    if (learnerId is null)
    {
        return Unauthorized(
            ApiResponse<TakeQuizDto>.FailureResponse(
                "Unauthorized."));
    }
    try
    {
        var result = await _quizService.TakeQuizAsync(
            learnerId.Value,
            quizId);
        if (result is null)
        {
            return NotFound(
                ApiResponse<TakeQuizDto>.FailureResponse(
                    "Quiz not found."));
        }
        return Ok(
            ApiResponse<TakeQuizDto>.SuccessResponse(
                result,
                "Quiz loaded successfully."));
    }
    catch (ArgumentException ex)
    {
        return BadRequest(
            ApiResponse<TakeQuizDto>.FailureResponse(
                ex.Message));
    }
}
[HttpPost("{quizId}/submit")]
[Authorize(Roles = "Learner")]
public async Task<ActionResult<ApiResponse<QuizResultDto>>> SubmitQuiz(
    int quizId,
    [FromBody] SubmitQuizRequest request)
{
    var learnerId = GetCurrentUserId();
    if (learnerId is null)
    {
        return Unauthorized(
            ApiResponse<QuizResultDto>.FailureResponse(
                "Unauthorized."));
    }
    try
    {
        var result = await _quizService.SubmitQuizAsync(
            learnerId.Value,
            quizId,
            request);
        if (result is null)
        {
            return NotFound(
                ApiResponse<QuizResultDto>.FailureResponse(
                    "Quiz attempt not found."));
        }
        return Ok(
            ApiResponse<QuizResultDto>.SuccessResponse(
                result,
                "Quiz submitted successfully."));
    }
    catch (ArgumentException ex)
    {
        return BadRequest(
            ApiResponse<QuizResultDto>.FailureResponse(
                ex.Message));
    }
}
[HttpGet("{quizId}/result/{attemptId}")]
[Authorize(Roles = "Learner")]
public async Task<ActionResult<ApiResponse<QuizResultDto>>> GetQuizResult(
    int quizId,
    int attemptId)
{
    var learnerId = GetCurrentUserId();
    if (learnerId is null)
    {
        return Unauthorized(
            ApiResponse<QuizResultDto>.FailureResponse(
                "Unauthorized."));
    }
    try
    {
        var result = await _quizService.GetQuizResultAsync(
            learnerId.Value,
            quizId,
            attemptId);
        if (result is null)
        {
            return NotFound(
                ApiResponse<QuizResultDto>.FailureResponse(
                    "Quiz result not found."));
        }
        return Ok(
            ApiResponse<QuizResultDto>.SuccessResponse(
                result,
                "Quiz result loaded successfully."));
    }
    catch (ArgumentException ex)
    {
        return BadRequest(
            ApiResponse<QuizResultDto>.FailureResponse(
                ex.Message));
    }
    catch
    {
        return StatusCode(
            StatusCodes.Status500InternalServerError,
            ApiResponse<QuizResultDto>.FailureResponse(
                "Unable to load quiz result. Please try again later."));
    }
}
[HttpGet("{quizId:int}/instructor/attempts")]
[Authorize(Roles = "Instructor")]
public async Task<ActionResult<ApiResponse<List<InstructorQuizAttemptDto>>>> GetInstructorAttempts(int quizId)
{
    var id = GetCurrentUserId();
    if (id is null) return Unauthorized();
    try { return Ok(ApiResponse<List<InstructorQuizAttemptDto>>.SuccessResponse(await _quizService.GetInstructorAttemptsAsync(id.Value, quizId), "Attempts loaded.")); }
    catch (UnauthorizedAccessException ex) { return StatusCode(403, ApiResponse<List<InstructorQuizAttemptDto>>.FailureResponse(ex.Message)); }
    catch (ArgumentException ex) { return BadRequest(ApiResponse<List<InstructorQuizAttemptDto>>.FailureResponse(ex.Message)); }
}
[HttpGet("{quizId:int}/instructor/attempts/{attemptId:int}")]
[Authorize(Roles = "Instructor")]
public async Task<ActionResult<ApiResponse<QuizResultDto>>> GetInstructorAttempt(int quizId, int attemptId)
{
    var id = GetCurrentUserId();
    if (id is null) return Unauthorized();
    try { return Ok(ApiResponse<QuizResultDto>.SuccessResponse((await _quizService.GetInstructorAttemptResultAsync(id.Value, quizId, attemptId))!, "Attempt loaded.")); }
    catch (UnauthorizedAccessException ex) { return StatusCode(403, ApiResponse<QuizResultDto>.FailureResponse(ex.Message)); }
    catch (ArgumentException ex) { return BadRequest(ApiResponse<QuizResultDto>.FailureResponse(ex.Message)); }
}
[HttpPut("answers/{quizAnswerId:int}/grade")]
[Authorize(Roles = "Instructor")]
public async Task<ActionResult<ApiResponse<QuizResultDto>>> GradeQuizAnswer(int quizAnswerId, [FromBody] ManualGradeQuizAnswerRequest request)
{
    if (!ModelState.IsValid)
    {
        var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
        return BadRequest(ApiResponse<QuizResultDto>.FailureResponse("Validation failed.", errors));
    }
    var instructorId = GetCurrentUserId();
    if (instructorId is null) return Unauthorized(ApiResponse<QuizResultDto>.FailureResponse("Unauthorized."));
    try
    {
        var result = await _quizService.GradeQuizAnswerAsync(instructorId.Value, quizAnswerId, request);
        if (result is null) return NotFound(ApiResponse<QuizResultDto>.FailureResponse("Quiz answer not found."));
        return Ok(ApiResponse<QuizResultDto>.SuccessResponse(result, "Quiz answer graded successfully."));
    }
    catch (UnauthorizedAccessException ex)
    {
        return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<QuizResultDto>.FailureResponse(ex.Message));
    }
    catch (ArgumentException ex)
    {
        return BadRequest(ApiResponse<QuizResultDto>.FailureResponse(ex.Message));
    }
    catch
    {
        return StatusCode(StatusCodes.Status500InternalServerError, ApiResponse<QuizResultDto>.FailureResponse("Unable to grade quiz answer. Please try again later."));
    }
}
[HttpGet("course/{courseId}")]
[Authorize(Roles = "Learner,Instructor,Admin")]
public async Task<IActionResult> GetQuizzesByCourse(int courseId)
{
    try
    {
        var result = await _quizService.GetQuizzesByCourseAsync(courseId);
        return Ok(new ApiResponse<List<QuizListItemDto>>
        {
            Success = true,
            Message = "Quizzes loaded successfully.",
            Data = result,
            Errors = new List<string>()
        });
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new ApiResponse<List<QuizListItemDto>>
        {
            Success = false,
            Message = ex.Message,
            Data = new List<QuizListItemDto>(),
            Errors = new List<string> { ex.Message }
        });
    }
    catch (Exception)
    {
        return StatusCode(500, new ApiResponse<List<QuizListItemDto>>
        {
            Success = false,
            Message = "An error occurred while loading quizzes.",
            Data = new List<QuizListItemDto>(),
            Errors = new List<string>()
        });
    }
}
[HttpGet("{quizId}/latest-result")]
[Authorize(Roles = "Learner")]
public async Task<IActionResult> GetLatestQuizResult(int quizId)
{
    var userId = GetCurrentUserId();
    if (userId is null)
        return Unauthorized();
    var attemptId = await _quizService.GetLatestQuizResultAsync(
        quizId,
        userId.Value);
    if (attemptId is null)
    {
        return NotFound(new
        {
            success = false,
            message = "Bạn chưa có kết quả Quiz."
        });
    }
    return Ok(new
    {
        success = true,
        data = new
        {
            attemptId = attemptId.Value
        }
    });
}
    [HttpGet("{quizId:int}/my-attempts")]
    [Authorize(Roles = "Learner")]
    public async Task<ActionResult<ApiResponse<List<LearnerQuizAttemptHistoryDto>>>> GetMyQuizAttempts(int quizId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId is null) return Unauthorized();
        if (quizId <= 0) return BadRequest(ApiResponse<List<LearnerQuizAttemptHistoryDto>>.FailureResponse("QuizId không hợp lệ."));
        var attempts = await _quizService.GetMyQuizAttemptsAsync(quizId, learnerId.Value);
        return Ok(ApiResponse<List<LearnerQuizAttemptHistoryDto>>.SuccessResponse(attempts, "Lịch sử làm Quiz của học viên."));
    }


    [HttpPost("media/upload")]
    [Authorize(Roles = "Instructor")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(110L * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 110L * 1024 * 1024)]
    public async Task<IActionResult> UploadQuizMedia(IFormFile? file, [FromForm] string? mediaType)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file cần tải lên." });

        var type = mediaType?.Trim().ToUpperInvariant();
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new Dictionary<string, string[]>
        {
            ["AUDIO"] = new[] { ".mp3", ".wav", ".m4a", ".ogg" },
            ["VIDEO"] = new[] { ".mp4", ".webm", ".mov" },
            ["IMAGE"] = new[] { ".jpg", ".jpeg", ".png", ".webp" }
        };
        var limits = new Dictionary<string, long>
        {
            ["AUDIO"] = 25L * 1024 * 1024,
            ["VIDEO"] = 100L * 1024 * 1024,
            ["IMAGE"] = 10L * 1024 * 1024
        };

        if (type is null || !allowedExtensions.ContainsKey(type))
            return BadRequest(new { message = "Loại media không hợp lệ." });
        if (!allowedExtensions[type].Contains(extension))
            return BadRequest(new { message = "Định dạng file không được hỗ trợ." });
        if (file.Length > limits[type])
            return BadRequest(new { message = $"Dung lượng tối đa {limits[type] / (1024 * 1024)}MB." });

        try
        {
            var folder = $"mseek/quizzes/{type.ToLowerInvariant()}";
            string? mediaUrl;
            string? publicId;
            if (type == "IMAGE")
            {
                var result = await _cloudinaryService.UploadImageAsync(file, folder);
                mediaUrl = result.SecureUrl?.ToString();
                publicId = result.PublicId;
            }
            else
            {
                // Cloudinary uses resource_type=video for audio and video.
                var result = await _cloudinaryService.UploadVideoAsync(file, folder);
                mediaUrl = result.SecureUrl?.ToString();
                publicId = result.PublicId;
            }
            if (string.IsNullOrWhiteSpace(mediaUrl) || string.IsNullOrWhiteSpace(publicId))
            {
                _logger.LogWarning("Cloudinary returned incomplete media upload data for {MediaType}", type);
                return StatusCode(502, new { message = "Cloudinary không trả về thông tin file hợp lệ." });
            }
            return Ok(new { mediaUrl, mediaType = type, publicId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Quiz media upload failed for {MediaType}", type);
            return StatusCode(502, new { message = "Không thể tải file lên Cloudinary. Vui lòng thử lại." });
        }
    }
}
