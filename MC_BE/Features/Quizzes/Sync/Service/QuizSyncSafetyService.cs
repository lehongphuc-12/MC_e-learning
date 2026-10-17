
using System.Security.Cryptography;
using System.Text;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MC_BE.Features.Quizzes.Sync;

public sealed record QuizSyncSafetyResult(
    int QuizId,
    string Status,
    bool CanWrite,
    bool HasLearnerAttempts,
    bool DatabaseChanged,
    bool SheetChanged,
    List<string> Problems
);

public sealed class QuizSyncSafetyService(
    SmartMcDbContext db,
    QuizSyncReviewService reviews)
{
    public async Task<QuizSyncSafetyResult> CheckAsync(
        int quizId,
        int instructorId,
        CancellationToken ct)
    {
        var problems = new List<string>();

        var owned = await db.Quizzes.AsNoTracking()
            .AnyAsync(q => q.QuizId == quizId &&
                           q.CreatedById == instructorId, ct);

        if (!owned)
            return new(quizId, "NOT_FOUND", false,
                false, false, false,
                ["Quiz does not exist or is not owned by instructor."]);

        var hasAttempts = await db.QuizAttempts.AsNoTracking()
            .AnyAsync(a => a.QuizId == quizId, ct);

        if (hasAttempts)
            problems.Add("Quiz has learner attempts. Existing quiz content cannot be overwritten.");

        var review = await reviews.ReviewAsync(
            quizId, instructorId, ct);

        problems.AddRange(review.Problems);

        if (string.IsNullOrWhiteSpace(review.DatabaseFingerprint) ||
            string.IsNullOrWhiteSpace(review.SheetFingerprint))
        {
            problems.Add("Synchronization fingerprints are unavailable.");
            return new(quizId, "INVALID_OR_INCOMPLETE",
                false, hasAttempts, false, false, problems);
        }

        await using var connection =
            new NpgsqlConnection(db.Database.GetConnectionString());

        await connection.OpenAsync(ct);

        await using var command = new NpgsqlCommand(
            @"SELECT db_fingerprint, sheet_fingerprint
              FROM quiz_sync_baselines
              WHERE quiz_id = @quizId",
            connection);

        command.Parameters.AddWithValue("quizId", quizId);

        string? oldDb = null;
        string? oldSheet = null;

        await using (var reader = await command.ExecuteReaderAsync(ct))
        {
            if (await reader.ReadAsync(ct))
            {
                oldDb = reader.GetString(0);
                oldSheet = reader.GetString(1);
            }
        }

        if (oldDb == null || oldSheet == null)
            return new(quizId, "BASELINE_REQUIRED",
                false, hasAttempts, false, false, problems);

        var dbChanged = !string.Equals(
            oldDb, review.DatabaseFingerprint,
            StringComparison.Ordinal);

        var sheetChanged = !string.Equals(
            oldSheet, review.SheetFingerprint,
            StringComparison.Ordinal);

        var status = dbChanged && sheetChanged ? "CONFLICT" :
                     dbChanged ? "DB_CHANGED" :
                     sheetChanged ? "SHEET_CHANGED" : "IN_SYNC";

        var canWrite = !hasAttempts &&
                       problems.Count == 0 &&
                       status == "SHEET_CHANGED";

        return new(
            quizId,
            problems.Count > 0 && !hasAttempts
                ? "INVALID_OR_INCOMPLETE" : status,
            canWrite,
            hasAttempts,
            dbChanged,
            sheetChanged,
            problems
        );
    }
}
