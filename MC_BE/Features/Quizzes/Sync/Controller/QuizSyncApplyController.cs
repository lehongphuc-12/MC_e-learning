
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Quizzes.Sync;

public sealed class ApplySheetPointsRequest
{
    public int QuestionId { get; set; }
    public decimal ExpectedDatabasePoints { get; set; }
    public decimal ExpectedSheetPoints { get; set; }
}

[ApiController]
[Route("api/quizzes/sync")]
[Authorize(Roles = "Instructor")]
public sealed class QuizSyncApplyController : ControllerBase
{
    [HttpPost("apply-points/{quizId:int}")]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public IActionResult ApplyPoints(int quizId, [FromBody] ApplySheetPointsRequest? request)
    {
        return StatusCode(StatusCodes.Status410Gone, new
        {
            status = "LEGACY_SYNC_DISABLED",
            message = "This legacy write endpoint is disabled. Use /api/quizzes/sync/full/plan/{quizId}, /execute/{quizId}, or conflict resolution."
        });
    }
}
