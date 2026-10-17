
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Quizzes.Sync;

[ApiController]
[Route("api/quizzes/sync/safety")]
[Authorize(Roles = "Instructor")]
public sealed class QuizSyncSafetyController(
    QuizSyncSafetyService safety
) : ControllerBase
{
    [HttpGet("{quizId:int}")]
    public async Task<IActionResult> Check(
        int quizId,
        CancellationToken ct)
    {
        if (!int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var instructorId))
            return Unauthorized();

        var result = await safety.CheckAsync(
            quizId, instructorId, ct);

        if (result.Status == "NOT_FOUND")
            return NotFound(result);

        return Ok(new
        {
            quizId,
            status = result.Status,
            canWrite = result.CanWrite,
            hasLearnerAttempts = result.HasLearnerAttempts,
            databaseChanged = result.DatabaseChanged,
            sheetChanged = result.SheetChanged,
            problems = result.Problems,
            canSyncAll = false,
            message = "Quiz/Questions safety check completed. Child tables are not included in this result."
        });
    }
}
