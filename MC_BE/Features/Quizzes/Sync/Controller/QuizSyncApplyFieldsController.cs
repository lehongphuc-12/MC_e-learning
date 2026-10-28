
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Quizzes.Sync;

public sealed class ApplySheetQuestionFieldRequest
{
    public int QuestionId { get; set; }
    public string Field { get; set; } = "";
    public string ExpectedDatabaseValue { get; set; } = "";
    public string ExpectedSheetValue { get; set; } = "";
}

[ApiController]
[Route("api/quizzes/sync")]
[Authorize(Roles = "Instructor")]
public sealed class QuizSyncApplyFieldsController : ControllerBase
{
    [HttpPost("apply-question-field/{quizId:int}")]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public IActionResult ApplyQuestionField(int quizId, [FromBody] ApplySheetQuestionFieldRequest? request)
    {
        return StatusCode(StatusCodes.Status410Gone, new
        {
            status = "LEGACY_SYNC_DISABLED",
            message = "This legacy write endpoint is disabled. Use /api/quizzes/sync/full/plan/{quizId}, /execute/{quizId}, or conflict resolution."
        });
    }
}
