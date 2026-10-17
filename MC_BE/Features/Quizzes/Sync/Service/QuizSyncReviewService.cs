
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using MC_BE.Features.Quizzes.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Quizzes.Sync;

public sealed record QuizSyncDifference(
    string Sheet,
    string Key,
    string Field,
    string DatabaseValue,
    string SheetValue
);

public sealed record QuizSyncReview(
    int QuizId,
    string Status,
    bool SafeToApply,
    List<string> Problems,
    List<QuizSyncDifference> Differences,
    string? DatabaseFingerprint = null,
    string? SheetFingerprint = null
);

public sealed class QuizSyncReviewService(
    QuizSheetReader reader,
    IQuizService quizzes,
    SmartMcDbContext db)
{
    private static readonly HashSet<string> NumericFields =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "Points",
            "OrderIndex",
            "TimeLimitMinutes",
            "PassingScore",
            "MaxAttempts"
        };

    private static readonly HashSet<string> BooleanFields =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "IsRequired",
            "IsCorrect"
        };

    private static string Cell(
        Dictionary<string, string> row,
        string key) =>
        row.GetValueOrDefault(key, "").Trim();

    private static string Normal(object? value) =>
        value is IFormattable formattable
            ? formattable.ToString(
                null,
                CultureInfo.InvariantCulture
            )?.Trim() ?? ""
            : (value?.ToString() ?? "").Trim();

    private static bool TryNumber(string value, out decimal number)
    {
        var text = value.Trim()
            .Replace("\u00A0", "")
            .Replace(" ", "");

        if (text.Contains(',') && text.Contains('.'))
        {
            number = 0;
            return false;
        }

        text = text.Replace(',', '.');

        return decimal.TryParse(
            text,
            NumberStyles.AllowLeadingSign |
            NumberStyles.AllowDecimalPoint,
            CultureInfo.InvariantCulture,
            out number
        );
    }

    private static bool SameValue(
        string field,
        string left,
        string right)
    {
        left = left.Trim();
        right = right.Trim();

        if (NumericFields.Contains(field) &&
            TryNumber(left, out var a) &&
            TryNumber(right, out var b))
            return a == b;

        if (BooleanFields.Contains(field) &&
            bool.TryParse(left, out var boolA) &&
            bool.TryParse(right, out var boolB))
            return boolA == boolB;

        return string.Equals(
            left,
            right,
            StringComparison.Ordinal
        );
    }

    public async Task<QuizSyncReview> ReviewAsync(
        int quizId,
        int instructorId,
        CancellationToken ct)
    {
        var problems = new List<string>();
        var differences = new List<QuizSyncDifference>();

        var dbCells = new SortedDictionary<string, string>(
            StringComparer.Ordinal
        );

        var sheetCells = new SortedDictionary<string, string>(
            StringComparer.Ordinal
        );

        var owned = await db.Quizzes
            .AsNoTracking()
            .AnyAsync(
                x => x.QuizId == quizId &&
                     x.CreatedById == instructorId,
                ct
            );

        if (!owned)
            return new(
                quizId,
                "NOT_AUTHORIZED_OR_MISSING",
                false,
                ["Quiz not found or instructor does not own it."],
                differences
            );

        var quiz = await quizzes.GetQuizByIdAsync(quizId);

        if (quiz == null)
            return new(
                quizId,
                "NOT_FOUND",
                false,
                ["Quiz could not be loaded."],
                differences
            );

        var data = await reader.ReadGoogleAsync(ct);

        var questions =
            data.GetValueOrDefault("Questions") ?? new();

        var rows = questions
            .Where(x =>
                Cell(x, "QuizId") ==
                quizId.ToString(CultureInfo.InvariantCulture))
            .ToList();

        var duplicates = rows
            .Where(x =>
                !string.IsNullOrEmpty(Cell(x, "QuestionId")))
            .GroupBy(
                x => Cell(x, "QuestionId"),
                StringComparer.OrdinalIgnoreCase
            )
            .Where(x => x.Count() > 1)
            .ToList();

        foreach (var duplicate in duplicates)
            problems.Add(
                $"Duplicate Questions.QuestionId={duplicate.Key} in Google Sheets."
            );

        if (rows.Count == 0)
            problems.Add(
                "No Questions rows with this QuizId. Never interpret absence as deletion."
            );

        void Compare(
            Dictionary<string, string> row,
            string sheet,
            string key,
            string field,
            object? dbValue)
        {
            if (!row.ContainsKey(field))
                return;

            var left = Normal(dbValue);
            var right = Cell(row, field);

            var identity = $"{sheet}/{key}/{field}";

            string Canon(string value)
            {
                if (NumericFields.Contains(field) &&
                    TryNumber(value, out var number))
                    return number.ToString(
                        CultureInfo.InvariantCulture
                    );

                if (BooleanFields.Contains(field) &&
                    bool.TryParse(value, out var boolean))
                    return boolean.ToString();

                return value;
            }

            dbCells[identity] = Canon(left);
            sheetCells[identity] = Canon(right);

            if (!SameValue(field, left, right))
                differences.Add(
                    new(
                        sheet,
                        key,
                        field,
                        left,
                        right
                    )
                );
        }

        foreach (var row in rows)
        {
            var idText = Cell(row, "QuestionId");

            if (!int.TryParse(idText, out var questionId) ||
                questionId <= 0)
            {
                problems.Add(
                    $"Questions row {Cell(row, "_row")}: missing database QuestionId. Requires manual mapping before update."
                );
                continue;
            }

            var existing = quiz.Questions
                .FirstOrDefault(
                    q => q.QuestionId == questionId
                );

            if (existing == null)
            {
                problems.Add(
                    $"QuestionId={questionId} does not belong to QuizId={quizId}."
                );
                continue;
            }

            Compare(row, "Questions", idText,
                "QuestionText", existing.QuestionText);

            Compare(row, "Questions", idText,
                "Instruction", existing.Instruction);

            Compare(row, "Questions", idText,
                "Explanation", existing.Explanation);

            Compare(row, "Questions", idText,
                "QuestionType", existing.QuestionType);

            Compare(row, "Questions", idText,
                "Points", existing.Points);

            Compare(row, "Questions", idText,
                "IsRequired", existing.IsRequired);

            Compare(row, "Questions", idText,
                "OrderIndex", existing.OrderIndex);
        }

        foreach (var question in quiz.Questions)
        {
            if (!rows.Any(x =>
                Cell(x, "QuestionId") ==
                question.QuestionId.ToString(
                    CultureInfo.InvariantCulture)))
            {
                problems.Add(
                    $"QuestionId={question.QuestionId} missing from Sheet; deletion will not be inferred."
                );
            }
        }

        var quizRows =
            data.GetValueOrDefault("Quizzes") ?? new();

        if (quizRows.Count == 0)
            problems.Add(
                "Quizzes tab missing or empty; baseline cannot be established."
            );

        if (quizRows.Count > 0)
        {
            var matching = quizRows
                .Where(x =>
                    Cell(x, "QuizId") ==
                    quizId.ToString(CultureInfo.InvariantCulture))
                .ToList();

            if (matching.Count > 1)
                problems.Add(
                    "Duplicate Quizzes.QuizId in Sheet."
                );

            if (matching.Count == 0)
                problems.Add(
                    "QuizId missing from Quizzes tab."
                );

            if (matching.Count == 1)
            {
                var row = matching[0];
                var key = quizId.ToString(
                    CultureInfo.InvariantCulture
                );

                Compare(row, "Quizzes", key,
                    "Title", quiz.Title);

                Compare(row, "Quizzes", key,
                    "Description", quiz.Description);

                Compare(row, "Quizzes", key,
                    "TimeLimitMinutes", quiz.TimeLimitMinutes);

                Compare(row, "Quizzes", key,
                    "PassingScore", quiz.PassingScore);

                Compare(row, "Quizzes", key,
                    "MaxAttempts", quiz.MaxAttempts);

                Compare(row, "Quizzes", key,
                    "Status", quiz.Status);
            }
        }

        var status = problems.Count > 0
            ? "INVALID_OR_INCOMPLETE"
            : differences.Count > 0
                ? "REVIEW_REQUIRED"
                : "MATCHING_VISIBLE_FIELDS";

        static string Hash(
            SortedDictionary<string, string> cells)
        {
            var content = string.Join(
                "\n",
                cells.Select(x =>
                    $"{x.Key.Length}:{x.Key}:{x.Value.Length}:{x.Value}")
            );

            return Convert.ToHexString(
                SHA256.HashData(
                    Encoding.UTF8.GetBytes(content)
                )
            );
        }

        return new QuizSyncReview(
            quizId,
            status,
            false,
            problems,
            differences,
            Hash(dbCells),
            Hash(sheetCells)
        );
    }
}
