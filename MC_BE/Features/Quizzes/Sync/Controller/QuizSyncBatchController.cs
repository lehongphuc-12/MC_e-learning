
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Quizzes.Sync;

public sealed class BatchQuestionChange
{
    public int QuestionId { get; set; }
    public string Field { get; set; } = "";
    public string ExpectedDatabaseValue { get; set; } = "";
    public string ExpectedSheetValue { get; set; } = "";
}

public sealed class ApplySheetBatchRequest
{
    public List<BatchQuestionChange> Changes { get; set; } = new();
}

[ApiController]
[Route("api/quizzes/sync")]
[Authorize(Roles = "Instructor")]
public sealed class QuizSyncBatchController : ControllerBase
{
    [HttpPost("apply-batch/{quizId:int}")]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public IActionResult ApplyBatch(int quizId, [FromBody] ApplySheetBatchRequest? request)
    {
        return StatusCode(StatusCodes.Status410Gone, new
        {
            status = "LEGACY_SYNC_DISABLED",
            message = "This legacy write endpoint is disabled. Use /api/quizzes/sync/full/plan/{quizId}, /execute/{quizId}, or conflict resolution."
        });
    }
}
