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
}