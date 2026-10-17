using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Quizzes.Sync;

[ApiController]
[Route("api/quizzes/sync")]
[Authorize(Roles = "Instructor")]
public sealed class QuizSyncReviewController(QuizSyncReviewService reviews, ILogger<QuizSyncReviewController> logger) : ControllerBase
{
    [HttpGet("review/{quizId:int}")]
    public async Task<IActionResult> Review(int quizId, CancellationToken ct)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var instructorId)) return Unauthorized();
        try
        {
            var result = await reviews.ReviewAsync(quizId, instructorId, ct);
            return result.Status == "NOT_AUTHORIZED_OR_MISSING" ? NotFound() : Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,"Sync review failed for QuizId {QuizId}",quizId);
            return StatusCode(502,new { message="Unable to compare Google Sheets and database. No data was changed." });
        }
    }
}
