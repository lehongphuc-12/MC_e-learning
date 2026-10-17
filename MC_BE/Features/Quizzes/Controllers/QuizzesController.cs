using MC_BE.Core.DTOs;
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
    public QuizzesController(IQuizService quizService, QuizSheetExporter sheetExporter, ILogger<QuizzesController> logger)
    {
        _quizService = quizService;
        _sheetExporter = sheetExporter;
        _logger = logger;
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
}
