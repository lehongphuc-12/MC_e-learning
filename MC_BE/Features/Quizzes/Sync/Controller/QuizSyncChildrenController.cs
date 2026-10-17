
using System.Globalization;
using System.Reflection;
using System.Security.Claims;
using MC_BE.Features.Quizzes.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Quizzes.Sync;

public sealed record ChildSyncDifference(string Sheet, string Key, string Field, string DatabaseValue, string SheetValue);
public sealed record ChildSyncReview(int QuizId, string Status, bool SafeToApply, List<string> Problems, List<ChildSyncDifference> Differences);

public sealed class ChildBatchChange
{
    public string Sheet { get; set; } = "";
    public int Id { get; set; }
    public string Field { get; set; } = "";
    public string ExpectedDatabaseValue { get; set; } = "";
    public string ExpectedSheetValue { get; set; } = "";
}

public sealed class ApplyChildBatchRequest
{
    public List<ChildBatchChange> Changes { get; set; } = new();
}

[ApiController]
[Route("api/quizzes/sync")]
[Authorize(Roles = "Instructor")]
public sealed class QuizSyncChildrenController(
    QuizSheetReader reader,
    IQuizService quizzes,
    SmartMcDbContext db,
    ILogger<QuizSyncChildrenController> logger
) : ControllerBase
{
    private static readonly Dictionary<string, (string Id, string[] Fields)> Config = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Choices"] = ("ChoiceId", ["ChoiceText", "OptionValue", "IsCorrect", "Explanation", "OrderIndex"]),
        ["Media"] = ("MediaId", ["MediaType", "MediaUrl", "Label", "DurationSeconds", "OrderIndex"]),
        ["ErrorRegions"] = ("ErrorRegionId", ["StartTimeMs", "EndTimeMs", "ErrorCategory", "ErrorCode", "Description", "CorrectionText", "Points"]),
        ["Annotations"] = ("AnnotationId", ["AnnotationType", "StartIndex", "EndIndex", "AnnotationValue", "Explanation", "Points"]),
        ["ArrangeItems"] = ("ArrangeItemId", ["Content", "CorrectOrder", "IsDistractor"]),
        ["WritingConfigs"] = ("WritingConfigId", ["EventType", "Audience", "Style", "MinWords", "MaxWords", "RequiredElementsJson", "GradingRubricJson"]),
        ["ScenarioNodes"] = ("NodeId", ["NodeType", "Title", "Content", "MediaUrl", "IsStartNode", "IsEndNode", "Points"]),
        ["ScenarioChoices"] = ("ScenarioChoiceId", ["ChoiceText", "NextNodeId", "Score", "Feedback", "OrderIndex"])
    };

    private static string Cell(Dictionary<string, string> row, string name) => row.GetValueOrDefault(name, "").Trim();
    private static string Format(object? value) => value is IFormattable f ? f.ToString(null, CultureInfo.InvariantCulture) ?? "" : value?.ToString() ?? "";

    private static bool Equivalent(object? database, string sheet)
    {
        var left = Format(database).Trim();
        var right = sheet.Trim();
        if (string.Equals(left, right, StringComparison.Ordinal)) return true;
        if (decimal.TryParse(left, NumberStyles.Number, CultureInfo.InvariantCulture, out var a) &&
            (decimal.TryParse(right, NumberStyles.Number, CultureInfo.InvariantCulture, out var b) ||
             decimal.TryParse(right, NumberStyles.Number, CultureInfo.GetCultureInfo("vi-VN"), out b)))
            return a == b;
        return bool.TryParse(left, out var x) && bool.TryParse(right, out var y) && x == y;
    }

    // Legacy write endpoint disabled. Full Sync is the only supported write path.
    [HttpPost("sync-children/{quizId:int}")]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public IActionResult SyncChildren(int quizId, CancellationToken ct)
    {
        return LegacySyncDisabled();
    }

    // Legacy batch write endpoint disabled.
    [HttpPost("apply-children-batch/{quizId:int}")]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public IActionResult ApplyChildrenBatch(int quizId, [FromBody] ApplyChildBatchRequest? request, CancellationToken ct)
    {
        return LegacySyncDisabled();
    }

    private IActionResult LegacySyncDisabled()
    {
        return StatusCode(StatusCodes.Status410Gone, new
        {
            status = "LEGACY_SYNC_DISABLED",
            message = "This legacy write endpoint is disabled. Use /api/quizzes/sync/full/plan/{quizId}, /execute/{quizId}, or conflict resolution."
        });
    }

    // Read-only review endpoint retained without changing its comparison logic.
    [HttpGet("review-children/{quizId:int}")]
    public async Task<IActionResult> ReviewChildren(int quizId, CancellationToken ct)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var instructorId)) return Unauthorized();

        try
        {
            if (!await db.Quizzes.AsNoTracking().AnyAsync(q => q.QuizId == quizId && q.CreatedById == instructorId, ct))
                return NotFound();

            var quiz = await quizzes.GetQuizByIdAsync(quizId);
            if (quiz == null) return NotFound();

            var sheetData = await reader.ReadGoogleAsync(ct);
            var problems = new List<string>();
            var differences = new List<ChildSyncDifference>();
            var ownedQuestionIds = quiz.Questions.Select(q => q.QuestionId).ToHashSet();

            var entities = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase)
            {
                ["Choices"] = quiz.Questions.SelectMany(q => q.Choices).Cast<object>().ToList(),
                ["Media"] = quiz.Questions.SelectMany(q => q.Media).Cast<object>().ToList(),
                ["ErrorRegions"] = quiz.Questions.SelectMany(q => q.ErrorRegions).Cast<object>().ToList(),
                ["Annotations"] = quiz.Questions.SelectMany(q => q.Annotations).Cast<object>().ToList(),
                ["ArrangeItems"] = quiz.Questions.SelectMany(q => q.ArrangeItems).Cast<object>().ToList(),
                ["WritingConfigs"] = quiz.Questions.Where(q => q.WritingConfig != null).Select(q => (object)q.WritingConfig!).ToList(),
                ["ScenarioNodes"] = quiz.Questions.SelectMany(q => q.ScenarioNodes).Cast<object>().ToList(),
                ["ScenarioChoices"] = quiz.Questions.SelectMany(q => q.ScenarioNodes).SelectMany(n => n.Choices).Cast<object>().ToList()
            };

            var ownedNodeIds = quiz.Questions.SelectMany(q => q.ScenarioNodes).Select(n => n.NodeId).ToHashSet();

            foreach (var (sheetName, spec) in Config)
            {
                var dbItems = entities[sheetName];
                var index = dbItems.ToDictionary(x => Convert.ToInt32(x.GetType().GetProperty(spec.Id)!.GetValue(x)), x => x);
                var allRows = sheetData.GetValueOrDefault(sheetName) ?? new();

                var rows = allRows.Where(r =>
                    (int.TryParse(Cell(r, "QuestionId"), out var qid) && ownedQuestionIds.Contains(qid)) ||
                    (sheetName == "ScenarioChoices" && int.TryParse(Cell(r, "NodeId"), out var nid) && ownedNodeIds.Contains(nid)) ||
                    (int.TryParse(Cell(r, spec.Id), out var id) && index.ContainsKey(id))).ToList();

                foreach (var group in rows.Where(r => !string.IsNullOrWhiteSpace(Cell(r, spec.Id)))
                    .GroupBy(r => Cell(r, spec.Id)).Where(g => g.Count() > 1))
                    problems.Add($"Duplicate {sheetName}.{spec.Id}={group.Key}.");

                foreach (var row in rows)
                {
                    var key = Cell(row, spec.Id);

                    if (!int.TryParse(key, out var id) || id <= 0)
                    {
                        problems.Add($"{sheetName} row {Cell(row, "_row")}: missing {spec.Id}; manual mapping required.");
                        continue;
                    }

                    if (!index.TryGetValue(id, out var entity))
                    {
                        problems.Add($"{sheetName}.{spec.Id}={id} does not belong to QuizId={quizId}.");
                        continue;
                    }

                    foreach (var field in spec.Fields)
                    {
                        if (!row.ContainsKey(field)) continue;

                        var property = entity.GetType().GetProperty(field, BindingFlags.Instance | BindingFlags.Public);
                        if (property == null)
                        {
                            problems.Add($"Unknown DTO property {sheetName}.{field}.");
                            continue;
                        }

                        var value = property.GetValue(entity);
                        if (!Equivalent(value, Cell(row, field)))
                            differences.Add(new(sheetName, key, field, Format(value), Cell(row, field)));
                    }
                }

                var visibleIds = rows.Select(r => Cell(r, spec.Id)).ToHashSet(StringComparer.Ordinal);

                foreach (var id in index.Keys)
                    if (!visibleIds.Contains(id.ToString(CultureInfo.InvariantCulture)))
                        problems.Add($"{sheetName}.{spec.Id}={id} missing from Sheet. Deletion will NOT be inferred.");
            }

            var status = problems.Count > 0 ? "INVALID_OR_INCOMPLETE" :
                         differences.Count > 0 ? "REVIEW_REQUIRED" :
                         "MATCHING_VISIBLE_FIELDS";

            return Ok(new ChildSyncReview(quizId, status, false, problems, differences));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Child sync review failed for QuizId {QuizId}", quizId);
            return StatusCode(502, new { message = "Unable to compare child data. No data was changed." });
        }
    }
}
