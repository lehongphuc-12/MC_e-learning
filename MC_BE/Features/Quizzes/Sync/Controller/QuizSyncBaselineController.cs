
using System.Security.Claims;
using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MC_BE.Features.Quizzes.Sync;

public sealed record QuizSyncBaseline(int QuizId, string DatabaseFingerprint, string SheetFingerprint, DateTime SyncedAtUtc);

[ApiController]
[Route("api/quizzes/sync/baseline")]
[Authorize(Roles = "Instructor")]
public sealed class QuizSyncBaselineController(
    SmartMcDbContext db,
    QuizSyncReviewService reviews,
    ILogger<QuizSyncBaselineController> logger
) : ControllerBase
{
    private int? InstructorId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private async Task<bool> OwnsAsync(int quizId, int instructorId, CancellationToken ct) =>
        await db.Quizzes.AsNoTracking().AnyAsync(q => q.QuizId == quizId && q.CreatedById == instructorId, ct);

    private async Task<QuizSyncBaseline?> LoadAsync(int quizId, CancellationToken ct)
    {
        await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
        await connection.OpenAsync(ct);
        await using var command = new NpgsqlCommand(
            @"SELECT quiz_id, db_fingerprint, sheet_fingerprint, synced_at_utc
              FROM quiz_sync_baselines
              WHERE quiz_id = @id", connection);
        command.Parameters.AddWithValue("id", quizId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return null;
        return new QuizSyncBaseline(reader.GetInt32(0), reader.GetString(1), reader.GetString(2), reader.GetDateTime(3));
    }

    [HttpGet("{quizId:int}")]
    public async Task<IActionResult> Status(int quizId, CancellationToken ct)
    {
        var instructorId = InstructorId();
        if (instructorId == null) return Unauthorized();
        if (!await OwnsAsync(quizId, instructorId.Value, ct)) return NotFound();

        try
        {
            var review = await reviews.ReviewAsync(quizId, instructorId.Value, ct);
            var baseline = await LoadAsync(quizId, ct);

            if (review.Problems.Count > 0)
                return Ok(new
                {
                    quizId,
                    status = "INVALID_OR_INCOMPLETE",
                    review.Problems,
                    review.Differences,
                    baseline
                });

            if (baseline == null)
                return Ok(new
                {
                    quizId,
                    status = "BASELINE_REQUIRED",
                    review.Differences,
                    baseline
                });

            var dbChanged = review.DatabaseFingerprint != baseline.DatabaseFingerprint;
            var sheetChanged = review.SheetFingerprint != baseline.SheetFingerprint;

            var status = dbChanged && sheetChanged ? "CONFLICT" :
                         dbChanged ? "DB_CHANGED" :
                         sheetChanged ? "SHEET_CHANGED" : "IN_SYNC";

            return Ok(new
            {
                quizId,
                status,
                dbChanged,
                sheetChanged,
                review.Differences,
                baseline
            });
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return StatusCode(503, new { message = "Run the supplied quiz_sync_baselines.sql migration first." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Baseline status failed for quiz {QuizId}", quizId);
            return StatusCode(502, new { message = "Cannot check synchronization status. No data changed." });
        }
    }

    [HttpPost("adopt/{quizId:int}")]
    public async Task<IActionResult> AdoptMatching(int quizId, CancellationToken ct)
    {
        var instructorId = InstructorId();
        if (instructorId == null) return Unauthorized();
        if (!await OwnsAsync(quizId, instructorId.Value, ct)) return NotFound();

        try
        {
            var review = await reviews.ReviewAsync(quizId, instructorId.Value, ct);

            if (review.Problems.Count > 0 ||
                review.Differences.Count > 0 ||
                string.IsNullOrWhiteSpace(review.DatabaseFingerprint) ||
                string.IsNullOrWhiteSpace(review.SheetFingerprint))
            {
                return Conflict(new
                {
                    message = "Baseline can only be adopted when all reviewed fields match and no problems exist.",
                    review.Problems,
                    review.Differences
                });
            }

            await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
            await connection.OpenAsync(ct);

            await using var command = new NpgsqlCommand(
                @"INSERT INTO quiz_sync_baselines
                  (quiz_id, db_fingerprint, sheet_fingerprint, synced_at_utc)
                  VALUES (@id, @db, @sheet, now())
                  ON CONFLICT (quiz_id) DO NOTHING
                  RETURNING quiz_id", connection);

            command.Parameters.AddWithValue("id", quizId);
            command.Parameters.AddWithValue("db", review.DatabaseFingerprint);
            command.Parameters.AddWithValue("sheet", review.SheetFingerprint);

            var inserted = await command.ExecuteScalarAsync(ct);

            if (inserted == null)
            {
                return Conflict(new
                {
                    quizId,
                    status = "BASELINE_ALREADY_EXISTS",
                    message = "A baseline already exists. Adoption cannot overwrite the existing synchronization checkpoint."
                });
            }

            return Ok(new
            {
                quizId,
                status = "BASELINE_ADOPTED",
                scope = "Quiz and Questions visible fields only",
                warning = "Does not authorize automatic overwrite or protect against concurrent Google Sheets edits."
            });
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            return StatusCode(503, new { message = "Run the supplied quiz_sync_baselines.sql migration first." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Baseline adoption failed for quiz {QuizId}", quizId);
            return StatusCode(502, new { message = "Cannot adopt baseline." });
        }
    }
}
