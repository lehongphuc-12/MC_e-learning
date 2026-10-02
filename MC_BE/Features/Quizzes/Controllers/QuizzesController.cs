using MC_BE.Core.DTOs;
using MC_BE.Features.Quizzes.DTOs;
using MC_BE.Features.Quizzes.Services.Interfaces;
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

    public QuizzesController(IQuizService quizService)
    {
        _quizService = quizService;
    }


    // =============================================================
    // Helper: Get current user ID from JWT
    // =============================================================

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(
            ClaimTypes.NameIdentifier)?.Value;

        return int.TryParse(claim, out var id)
            ? id
            : null;
    }

// =============================================================
// GET /api/quizzes/{id}
// Get quiz detail
// =============================================================

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
    // =============================================================
    // POST /api/quizzes
    // Create quiz
    // =============================================================

    [HttpPost]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<QuizDto>>> CreateQuiz(
        [FromBody] CreateQuizRequest request)
    {
        // ---------------------------------------------------------
        // 1. Validate DTO
        // ---------------------------------------------------------

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


        // ---------------------------------------------------------
        // 2. Get current instructor
        // ---------------------------------------------------------

        var instructorId = GetCurrentUserId();

        if (instructorId is null)
        {
            return Unauthorized(
                ApiResponse<QuizDto>.FailureResponse(
                    "Unauthorized."));
        }


        // ---------------------------------------------------------
        // 3. Create Quiz
        // ---------------------------------------------------------

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

            // -----------------------------------------------------
            // 4. Return 201 Created
            // -----------------------------------------------------

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
// =============================================================
// GET /api/quizzes/{quizId}/result/{attemptId}
// View quiz result
// =============================================================

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