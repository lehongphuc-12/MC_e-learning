using System.Globalization;
using Google.Apis.Sheets.v4.Data;
using MC_BE.Features.Quizzes.DTOs;
using MC_BE.Features.Quizzes.Services.Interfaces;
namespace MC_BE.Features.Quizzes.Sync;
public sealed class QuizSheetExporter(QuizSheetReader reader, IQuizService quizService)
{
    private static readonly string[] QuizHeaders = ["QuizId", "CourseId", "LessonId", "Title", "Description", "TimeLimitMinutes", "PassingScore", "MaxAttempts", "Status"];
    private static readonly HashSet<string> NumericColumns = new(StringComparer.OrdinalIgnoreCase)
    {
        "Points", "PassingScore", "Score", "QuizId", "CourseId", "LessonId", "QuestionId",
        "ChoiceId", "MediaId", "ErrorRegionId", "AnnotationId", "ArrangeItemId",
        "WritingConfigId", "NodeId", "ScenarioChoiceId", "NextNodeId",
        "TimeLimitMinutes", "MaxAttempts", "OrderIndex", "DurationSeconds",
        "StartTimeMs", "EndTimeMs", "StartIndex", "EndIndex", "CorrectOrder",
        "MinWords", "MaxWords"

    };

    static string S(object? x) => x?.ToString() ?? "";
    private static bool TryParseNumber(string value, out decimal result)
    {
        value = (value ?? "").Trim().Replace("\u00A0", "").Replace(" ", "");
        const NumberStyles styles = NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint;
        return decimal.TryParse(value, styles, CultureInfo.InvariantCulture, out result)
            || decimal.TryParse(value, styles, CultureInfo.GetCultureInfo("vi-VN"), out result);
    }

    private static bool SameCellValue(string column, string sheetValue, string dbValue)
    {
        var left = (sheetValue ?? "").Trim();
        var right = (dbValue ?? "").Trim();

        if (NumericColumns.Contains(column) &&
            TryParseNumber(left, out var a) &&
            TryParseNumber(right, out var b))
            return a == b;

        return string.Equals(left, right, StringComparison.Ordinal);
    }

    public async Task<int> ExportAsync(int quizId, CancellationToken ct)

    {
        var quiz = await quizService.GetQuizByIdAsync(quizId) ?? throw new ArgumentException("Quiz not found.");
        using var api = await reader.ConnectAsync(ct);
        var spreadsheet = await api.Spreadsheets.Get(QuizSheetReader.SpreadsheetId).ExecuteAsync(ct);
        if (spreadsheet.Sheets?.All(s => s.Properties?.Title != "Quizzes") != false)
        {
            var add = new BatchUpdateSpreadsheetRequest
            {
                Requests = [new Request { AddSheet = new AddSheetRequest { Properties = new SheetProperties { Title = "Quizzes" } } }]
            };
            await api.Spreadsheets.BatchUpdate(add, QuizSheetReader.SpreadsheetId).ExecuteAsync(ct);
        }
        var updates = new List<ValueRange>();
        var additions = new Dictionary<string, List<IList<object>>>(StringComparer.OrdinalIgnoreCase);
        var snapshots = new Dictionary<string, IList<IList<object>>>(StringComparer.OrdinalIgnoreCase);
        var sheetNames = new[]
        {
            "Quizzes", "Questions", "Choices", "Media", "ErrorRegions",
            "Annotations", "ArrangeItems", "WritingConfigs", "ScenarioNodes", "ScenarioChoices"
        };
        var batch = api.Spreadsheets.Values.BatchGet(QuizSheetReader.SpreadsheetId);
        batch.Ranges = sheetNames.Select(x => $"'{x}'!A1:AZ").ToList();
        var response = await batch.ExecuteAsync(ct);
        for (var i = 0; i < sheetNames.Length; i++)
            snapshots[sheetNames[i]] = response.ValueRanges?.ElementAtOrDefault(i)?.Values ?? new List<IList<object>>();
        void Upsert(string sheet, string idColumn, string id, Dictionary<string, object?> values, string[]? initialHeaders = null)
        {
            var current = snapshots[sheet];
            var headers = current.Count == 0 ? (initialHeaders ?? values.Keys.ToArray()) : current[0].Select(S).ToArray();
            if (current.Count == 0)
                updates.Add(new ValueRange { Range = $"'{sheet}'!A1", Values = [headers.Cast<object>().ToList()] });
            var idIndex = Array.FindIndex(headers, h => h.Equals(idColumn, StringComparison.OrdinalIgnoreCase));
            if (idIndex < 0)
                throw new InvalidOperationException($"{sheet} has no {idColumn} column.");
            var matchingRows = Enumerable.Range(1, Math.Max(0, current.Count - 1))
                .Where(i => idIndex < current[i].Count && S(current[i][idIndex]) == id)
                .ToList();
            if (matchingRows.Count > 1)
                throw new InvalidOperationException($"SAFE_SYNC_BLOCKED: Duplicate {sheet}.{idColumn}={id}.");
            var existingRow = matchingRows.FirstOrDefault();
            var cells = headers.Select((h, index) =>
                (object)(values.TryGetValue(h, out var value)
                    ? S(value)
                    : existingRow > 0 && index < current[existingRow].Count
                        ? S(current[existingRow][index])
                        : "")
            ).ToList();
            if (existingRow > 0)
            {
                var before = headers.Select((h, index) =>
                    index < current[existingRow].Count ? S(current[existingRow][index]) : ""
                ).ToArray();
                var changed = headers
                    .Where((h, index) => values.ContainsKey(h) &&
                        !SameCellValue(h, before[index], S(values[h])))
                    .ToList();
if (changed.Count > 0){
    var details = changed.Select(h =>
    {
     var index = Array.FindIndex(headers, x => x.Equals(h, StringComparison.OrdinalIgnoreCase));
        var sheetValue = index >= 0 && index < before.Length ? before[index] : "";
        var dbValue = S(values[h]);
        return $"{h}: Sheet=[{sheetValue}], DB=[{dbValue}]";
    });
    throw new InvalidOperationException(
        $"SAFE_SYNC_BLOCKED: {sheet}.{idColumn}={id}; {string.Join("; ", details)}"
    );
}
            }
            else
            {
                if (!additions.ContainsKey(sheet))
                    additions[sheet] = new List<IList<object>>();
                additions[sheet].Add(cells);
            }
        }
        Upsert("Quizzes", "QuizId", S(quiz.QuizId), new()
        {
            ["QuizId"] = quiz.QuizId,
            ["CourseId"] = quiz.CourseId,
            ["LessonId"] = quiz.LessonId,
            ["Title"] = quiz.Title,
            ["Description"] = quiz.Description,
            ["TimeLimitMinutes"] = quiz.TimeLimitMinutes,
            ["PassingScore"] = quiz.PassingScore,
            ["MaxAttempts"] = quiz.MaxAttempts,
            ["Status"] = quiz.Status
        }, QuizHeaders);
        foreach (var q in quiz.Questions)
        {
            var key = $"DB-Q{q.QuestionId}";
            Upsert("Questions", "QuestionId", S(q.QuestionId), new()
            {
                ["QuestionKey"] = key,
                ["QuestionId"] = q.QuestionId,
                ["LessonKey"] = "",
                ["QuizId"] = quiz.QuizId,
                ["QuestionType"] = q.QuestionType,
                ["QuestionText"] = q.QuestionText,
                ["Instruction"] = q.Instruction,
                ["Explanation"] = q.Explanation,
                ["Points"] = q.Points,
                ["IsRequired"] = q.IsRequired,
                ["OrderIndex"] = q.OrderIndex,
                ["ReviewStatus"] = "IMPORTED_FROM_DB"
            });
            foreach (var c in q.Choices)
                Upsert("Choices", "ChoiceId", S(c.ChoiceId), new()
                {

                    ["QuestionKey"] = key,
                    ["ChoiceId"] = c.ChoiceId,
                    ["QuestionId"] = q.QuestionId,
                    ["ChoiceText"] = c.ChoiceText,
                    ["OptionValue"] = c.OptionValue,
                    ["IsCorrect"] = c.IsCorrect,
                    ["Explanation"] = c.Explanation,
                    ["OrderIndex"] = c.OrderIndex

                });

            foreach (var m in q.Media)
                Upsert("Media", "MediaId", S(m.MediaId), new()

                {

                    ["QuestionKey"] = key,
                    ["MediaId"] = m.MediaId,
                    ["QuestionId"] = q.QuestionId,
                    ["MediaType"] = m.MediaType,
                    ["MediaUrl"] = m.MediaUrl,
                    ["Label"] = m.Label,
                    ["DurationSeconds"] = m.DurationSeconds,
                    ["OrderIndex"] = m.OrderIndex

                });

            foreach (var r in q.ErrorRegions)
                Upsert("ErrorRegions", "ErrorRegionId", S(r.ErrorRegionId), new()

                {
                    ["QuestionKey"] = key,
                    ["ErrorRegionId"] = r.ErrorRegionId,
                    ["QuestionId"] = q.QuestionId,
                    ["StartTimeMs"] = r.StartTimeMs,
                    ["EndTimeMs"] = r.EndTimeMs,
                    ["ErrorCategory"] = r.ErrorCategory,
                    ["ErrorCode"] = r.ErrorCode,
                    ["Description"] = r.Description,
                    ["CorrectionText"] = r.CorrectionText,
                    ["Points"] = r.Points

                });

            foreach (var a in q.Annotations)
                Upsert("Annotations", "AnnotationId", S(a.AnnotationId), new()

                {
                    ["QuestionKey"] = key,
                    ["AnnotationId"] = a.AnnotationId,
                    ["QuestionId"] = q.QuestionId,
                    ["AnnotationType"] = a.AnnotationType,
                    ["StartIndex"] = a.StartIndex,
                    ["EndIndex"] = a.EndIndex,
                    ["AnnotationValue"] = a.AnnotationValue,
                    ["Explanation"] = a.Explanation,
                    ["Points"] = a.Points

                });

            foreach (var a in q.ArrangeItems)
                Upsert("ArrangeItems", "ArrangeItemId", S(a.ArrangeItemId), new()

                {

                    ["QuestionKey"] = key,
                    ["ArrangeItemId"] = a.ArrangeItemId,
                    ["QuestionId"] = q.QuestionId,
                    ["Content"] = a.Content,
                    ["CorrectOrder"] = a.CorrectOrder,
                    ["IsDistractor"] = a.IsDistractor

                });

            if (q.WritingConfig is { } w)
                Upsert("WritingConfigs", "WritingConfigId", S(w.WritingConfigId), new()

                {
                    ["QuestionKey"] = key,
                    ["WritingConfigId"] = w.WritingConfigId,
                    ["QuestionId"] = q.QuestionId,
                    ["EventType"] = w.EventType,
                    ["Audience"] = w.Audience,
                    ["Style"] = w.Style,
                    ["MinWords"] = w.MinWords,
                    ["MaxWords"] = w.MaxWords,
                    ["RequiredElementsJson"] = w.RequiredElementsJson,
                    ["GradingRubricJson"] = w.GradingRubricJson

                });

            foreach (var n in q.ScenarioNodes)
            {
                Upsert("ScenarioNodes", "NodeId", S(n.NodeId), new()
                {

                    ["QuestionKey"] = key,
                    ["NodeKey"] = $"DB-N{n.NodeId}",
                    ["NodeId"] = n.NodeId,
                    ["QuestionId"] = q.QuestionId,
                    ["NodeType"] = n.NodeType,
                    ["Title"] = n.Title,
                    ["Content"] = n.Content,
                    ["MediaUrl"] = n.MediaUrl,
                    ["IsStartNode"] = n.IsStartNode,
                    ["IsEndNode"] = n.IsEndNode,
                    ["Points"] = n.Points

                });

                foreach (var c in n.Choices)
                    Upsert("ScenarioChoices", "ScenarioChoiceId", S(c.ScenarioChoiceId), new()

                    {

                        ["QuestionKey"] = key,
                        ["NodeKey"] = $"DB-N{n.NodeId}",
                        ["ScenarioChoiceId"] = c.ScenarioChoiceId,
                        ["NodeId"] = n.NodeId,
                        ["ChoiceText"] = c.ChoiceText,
                        ["NextNodeKey"] = c.NextNodeId is int next ? $"DB-N{next}" : "",
                        ["NextNodeId"] = c.NextNodeId,
                        ["Score"] = c.Score,
                        ["Feedback"] = c.Feedback,
                        ["OrderIndex"] = c.OrderIndex
                    });
            }
        }
        var overwrites = updates
            .Where(x => !x.Range!.Equals("'Quizzes'!A1", StringComparison.OrdinalIgnoreCase))
            .ToList();
        if (overwrites.Count > 0)
            throw new InvalidOperationException(
                "SAFE_SYNC_BLOCKED: Existing Google Sheets rows were found for this Quiz. Export is read-only until a common sync baseline and conflict resolution are implemented. No existing rows were overwritten."

            );
        foreach (var (sheet, rows) in additions)
        {
            var header = snapshots[sheet].FirstOrDefault()?.Select(S).ToArray()
                ?? (sheet == "Quizzes" ? QuizHeaders : Array.Empty<string>());
            var idColumn = sheet switch
            {
                "Quizzes" => "QuizId",
                "Questions" => "QuestionId",
                "Choices" => "ChoiceId",
                "Media" => "MediaId",
                "ErrorRegions" => "ErrorRegionId",
                "Annotations" => "AnnotationId",
                "ArrangeItems" => "ArrangeItemId",
                "WritingConfigs" => "WritingConfigId",
                "ScenarioNodes" => "NodeId",
                "ScenarioChoices" => "ScenarioChoiceId",
                _ => ""

            };

            var index = Array.FindIndex(header, h =>
                h.Equals(idColumn, StringComparison.OrdinalIgnoreCase));
            if (index < 0 && sheet != "Quizzes")
                throw new InvalidOperationException($"SAFE_SYNC_BLOCKED: Missing ID header in {sheet}.");
            if (index >= 0 && rows.GroupBy(r => index < r.Count ? S(r[index]) : "")
                .Any(g => g.Key.Length > 0 && g.Count() > 1))
                throw new InvalidOperationException($"SAFE_SYNC_BLOCKED: Duplicate IDs in pending {sheet} rows.");

        }
        if (updates.Count > 0)
            await api.Spreadsheets.Values.BatchUpdate(
                new BatchUpdateValuesRequest { ValueInputOption = "RAW", Data = updates },
                QuizSheetReader.SpreadsheetId
            ).ExecuteAsync(ct);
        foreach (var (sheet, rows) in additions)
        {
            var request = api.Spreadsheets.Values.Append(
                new ValueRange { Values = rows },
                QuizSheetReader.SpreadsheetId,
                $"'{sheet}'!A:AZ"
            );
            request.ValueInputOption =
                Google.Apis.Sheets.v4.SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.RAW;
            request.InsertDataOption =
                Google.Apis.Sheets.v4.SpreadsheetsResource.ValuesResource.AppendRequest.InsertDataOptionEnum.INSERTROWS;
            await request.ExecuteAsync(ct);
        }
        return updates.Count + additions.Sum(x => x.Value.Count);
    }
}
