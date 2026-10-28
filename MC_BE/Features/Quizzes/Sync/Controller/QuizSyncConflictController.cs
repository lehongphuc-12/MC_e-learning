using System.Security.Claims;
using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Quizzes.Sync;

public sealed class ResolveQuizConflictRequest
{
    public string Table { get; set; } = "";
    public int RecordId { get; set; }
    public string Field { get; set; } = "";
    public string Winner { get; set; } = ""; // DATABASE or SHEET
}

[ApiController]
[Route("api/quizzes/sync/conflicts")]
[Authorize(Roles = "Instructor")]
public sealed class QuizSyncConflictController(QuizFullSyncService sync, SmartMcDbContext db,
    ILogger<QuizSyncConflictController> logger) : ControllerBase
{
    private int? InstructorId() => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    [HttpGet("{quizId:int}")]
    public async Task<IActionResult> Get(int quizId, CancellationToken ct)
    {
        if (InstructorId() is not int instructorId) return Unauthorized();
        if (!await db.Quizzes.AsNoTracking().AnyAsync(q => q.QuizId == quizId && q.CreatedById == instructorId, ct)) return NotFound();
        var items = await db.Database.SqlQueryRaw<ConflictListRow>(@"SELECT conflict_id AS ""ConflictId"", table_name AS ""Table"",
            record_id AS ""RecordId"", field_name AS ""Field"", baseline_value AS ""BaselineValue"",
            database_value AS ""DatabaseValue"", sheet_value AS ""SheetValue"", status AS ""Status""
            FROM quiz_sync_conflicts WHERE quiz_id = {0} ORDER BY conflict_id", quizId).ToListAsync(ct);
        return Ok(new { quizId, conflicts = items });
    }

    [HttpPost("resolve/{quizId:int}")]
    public async Task<IActionResult> Resolve(int quizId, [FromBody] ResolveQuizConflictRequest request, CancellationToken ct)
    {
        if (InstructorId() is not int instructorId) return Unauthorized();
        if (request == null || string.IsNullOrWhiteSpace(request.Table) || string.IsNullOrWhiteSpace(request.Field) || string.IsNullOrWhiteSpace(request.Winner) || request.RecordId <= 0 ||
            (request.Winner.Trim().ToUpperInvariant() != "DATABASE" && request.Winner.Trim().ToUpperInvariant() != "SHEET")) return BadRequest();
        try
        {
            var result = await sync.ResolveConflictAsync(quizId, instructorId, request.Table.Trim(), request.RecordId,
                request.Field.Trim(), request.Winner.Trim().ToUpperInvariant(), ct);
            return result.Status == "NOT_FOUND" ? NotFound(result) : result.Status == "RESOLVED" ? Ok(result) : Conflict(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Resolve conflict failed for QuizId={QuizId}", quizId);
            return StatusCode(500, new { status = "RESOLVE_FAILED", message = "Resolution not confirmed. Review DB, Sheet and baseline before retrying." });
        }
    }

    public sealed class ConflictListRow
    {
        public long ConflictId { get; set; }
        public string Table { get; set; } = "";
        public int RecordId { get; set; }
        public string Field { get; set; } = "";
        public string BaselineValue { get; set; } = "";
        public string DatabaseValue { get; set; } = "";
        public string SheetValue { get; set; } = "";
        public string Status { get; set; } = "";
    }
}
