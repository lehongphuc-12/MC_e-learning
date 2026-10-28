using System.Globalization;
using MC_BE.Core.Enums;

using MC_BE.Features.Quizzes.DTOs;
using MC_BE.Features.Quizzes.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Quizzes.Sync;

public sealed record ImportProblem(string Sheet, string Row, string Message);
public sealed record QuizImportPreview(CreateQuizRequest? Quiz, List<ImportProblem> Errors, int QuestionCount)
{
    public bool CanImport => Quiz != null && Errors.Count == 0;
}

public sealed class QuizImportService(SmartMcDbContext db, IQuizService quizService)
{
    static string V(Dictionary<string, string> r, string key) => r.GetValueOrDefault(key, "").Trim();
    static int Int(Dictionary<string, string> r, string key, int fallback = 0) => int.TryParse(V(r, key), out var v) ? v : fallback;
    static decimal Dec(Dictionary<string, string> r, string key, decimal fallback = 0) => decimal.TryParse(V(r, key), NumberStyles.Any, CultureInfo.InvariantCulture, out var v) ? v : fallback;
    static bool Bool(Dictionary<string, string> r, string key, bool fallback = false) => V(r, key).Length == 0 ? fallback : V(r, key).Equals("TRUE", StringComparison.OrdinalIgnoreCase) || V(r, key) == "1";
    static T EnumValue<T>(Dictionary<string, string> r, string key) where T : struct, Enum => Enum.TryParse<T>(V(r, key), true, out var value) && Enum.IsDefined(value) ? value : throw new FormatException($"Invalid {key}: '{V(r, key)}'.");
    static List<Dictionary<string, string>> Rows(Dictionary<string, List<Dictionary<string, string>>> data, string sheet) => data.GetValueOrDefault(sheet) ?? new();

    public async Task<bool> OwnsQuizAsync(int quizId, int instructorId, CancellationToken ct) => await db.Quizzes.AsNoTracking().AnyAsync(x => x.QuizId == quizId && x.CreatedById == instructorId, ct);
    public async Task<QuizImportPreview> PreviewAsync(Dictionary<string, List<Dictionary<string, string>>> data, int courseId, int lessonId, string title, int instructorId, CancellationToken ct)
    {
        var errors = new List<ImportProblem>();
        var course = await db.Courses.AsNoTracking().FirstOrDefaultAsync(x => x.CourseId == courseId, ct);
        var lesson = await db.Lessons.AsNoTracking().FirstOrDefaultAsync(x => x.LessonId == lessonId, ct);
        if (course == null || lesson == null || lesson.CourseId != courseId) errors.Add(new("Lessons", "-", "CourseId / LessonId not found or do not match."));
        else if (course.InstructorId != instructorId) errors.Add(new("Lessons", "-", "You are not the instructor of this course."));
        if (await db.Quizzes.AsNoTracking().AnyAsync(x => x.CourseId == courseId && x.LessonId == lessonId, ct)) errors.Add(new("Quizzes", "-", "This lesson already has a quiz. Import blocked to avoid duplicates or overwriting attempts."));
        if (string.IsNullOrWhiteSpace(title)) errors.Add(new("Quizzes", "-", "Quiz title is required."));
        var lessonRows = Rows(data, "Lessons");
        var matched = lessonRows.Where(x => V(x, "LessonId") == lessonId.ToString()).ToList();
        if (matched.Count == 0 && lesson != null) matched = lessonRows.Where(x => V(x, "LessonTitle").Equals(lesson.Title.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
        if (matched.Count != 1) errors.Add(new("Lessons", "-", "Cannot identify exactly one LessonKey. Fill Lessons.LessonId with the actual database LessonId or ensure the lesson title is unique and identical."));
        var lessonKey = matched.Count == 1 ? V(matched[0], "LessonKey") : "";
        var sourceQuestions = Rows(data, "Questions").Where(x => V(x, "LessonKey").Equals(lessonKey, StringComparison.OrdinalIgnoreCase) && lessonKey.Length > 0).ToList();
        if (sourceQuestions.Count == 0) errors.Add(new("Questions", "-", "No questions found for the selected LessonKey."));
        var duplicateKeys = sourceQuestions.GroupBy(x => V(x, "QuestionKey"), StringComparer.OrdinalIgnoreCase).Where(g => g.Key.Length == 0 || g.Count() > 1);
        foreach (var g in duplicateKeys) errors.Add(new("Questions", "-", $"Duplicate or empty QuestionKey: {g.Key}"));
        var request = new CreateQuizRequest { CourseId = courseId, LessonId = lessonId, Title = title.Trim(), Status = QuizStatus.DRAFT };
        var children = new[] { "Choices", "Media", "ErrorRegions", "Annotations", "ArrangeItems", "WritingConfigs", "ScenarioNodes", "ScenarioChoices" };
        var keys = sourceQuestions.Select(x => V(x, "QuestionKey")).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var sheet in children) foreach (var r in Rows(data, sheet))
            if (V(r, "QuestionKey").Length > 0 && !Rows(data, "Questions").Any(q => V(q, "QuestionKey").Equals(V(r, "QuestionKey"), StringComparison.OrdinalIgnoreCase)))
                errors.Add(new(sheet, V(r, "_row"), "QuestionKey does not exist in Questions."));
        foreach (var row in sourceQuestions)
        {
            var key = V(row, "QuestionKey");
            var q = new CreateQuestionRequest();
            try
            {
                q.QuestionText = V(row, "QuestionText"); q.QuestionType = EnumValue<QuestionType>(row, "QuestionType");
                q.Instruction = V(row, "Instruction"); q.Explanation = V(row, "Explanation");
                q.Points = Dec(row, "Points", 1); q.IsRequired = Bool(row, "IsRequired", true); q.OrderIndex = Int(row, "OrderIndex", request.Questions.Count + 1);
                if (q.QuestionText.Length == 0 || q.Points <= 0 || q.OrderIndex <= 0) throw new FormatException("QuestionText, Points (>0) and OrderIndex (>0) are required.");
                List<Dictionary<string, string>> Child(string sheet) => Rows(data, sheet).Where(x => V(x, "QuestionKey").Equals(key, StringComparison.OrdinalIgnoreCase)).ToList();
                foreach (var x in Child("Choices")) q.Choices.Add(new CreateChoiceRequest { ChoiceText = V(x, "ChoiceText"), OptionValue = V(x, "OptionValue"), IsCorrect = Bool(x, "IsCorrect"), Explanation = V(x, "Explanation"), OrderIndex = Int(x, "OrderIndex", q.Choices.Count + 1) });
                foreach (var x in Child("Media")) q.Media.Add(new CreateQuestionMediaRequest { MediaType = EnumValue<QuestionMediaType>(x, "MediaType"), MediaUrl = V(x, "MediaUrl"), Label = V(x, "Label"), DurationSeconds = Int(x, "DurationSeconds") is var n && n > 0 ? n : null, OrderIndex = Int(x, "OrderIndex", q.Media.Count + 1) });
                foreach (var x in Child("ErrorRegions")) q.ErrorRegions.Add(new CreateErrorRegionRequest { StartTimeMs = Int(x, "StartTimeMs"), EndTimeMs = Int(x, "EndTimeMs"), ErrorCategory = V(x, "ErrorCategory"), ErrorCode = V(x, "ErrorCode"), Description = V(x, "Description"), CorrectionText = V(x, "CorrectionText"), Points = Dec(x, "Points", 1) });
                foreach (var x in Child("Annotations")) q.Annotations.Add(new CreateAnnotationRequest { AnnotationType = EnumValue<AnnotationType>(x, "AnnotationType"), StartIndex = Int(x, "StartIndex"), EndIndex = Int(x, "EndIndex"), AnnotationValue = V(x, "AnnotationValue"), Explanation = V(x, "Explanation"), Points = Dec(x, "Points", 1) });
                foreach (var x in Child("ArrangeItems")) q.ArrangeItems.Add(new CreateArrangeItemRequest { Content = V(x, "Content"), CorrectOrder = Int(x, "CorrectOrder") is var n && n > 0 ? n : null, IsDistractor = Bool(x, "IsDistractor") });
                var configs = Child("WritingConfigs");
                if (configs.Count > 1) errors.Add(new("WritingConfigs", V(configs[1], "_row"), "Only one writing config per question."));
                if (configs.Count > 0) { var x = configs[0]; q.WritingConfig = new CreateWritingConfigRequest { EventType = V(x, "EventType"), Audience = V(x, "Audience"), Style = V(x, "Style"), MinWords = Int(x, "MinWords") is var a && a > 0 ? a : null, MaxWords = Int(x, "MaxWords") is var b && b > 0 ? b : null, RequiredElementsJson = V(x, "RequiredElementsJson"), GradingRubricJson = V(x, "GradingRubricJson") }; }
                var nodeRows = Child("ScenarioNodes");
                foreach (var x in nodeRows)
                {
                    var nodeKey = V(x, "NodeKey");
                    if (nodeKey.Length == 0) throw new FormatException("ScenarioNodes.NodeKey is required.");
                    var node = new CreateScenarioNodeRequest { ClientKey = nodeKey, NodeType = EnumValue<ScenarioNodeType>(x, "NodeType"), Title = V(x, "Title"), Content = V(x, "Content"), MediaUrl = V(x, "MediaUrl"), IsStartNode = Bool(x, "IsStartNode"), IsEndNode = Bool(x, "IsEndNode"), Points = Dec(x, "Points") is var p && p > 0 ? p : null };
                    foreach (var c in Child("ScenarioChoices").Where(c => V(c, "NodeKey").Equals(nodeKey, StringComparison.OrdinalIgnoreCase))) node.Choices.Add(new CreateScenarioChoiceRequest { ChoiceText = V(c, "ChoiceText"), NextNodeClientKey = V(c, "NextNodeKey") is var next && next.Length > 0 ? next : null, Score = Dec(c, "Score"), Feedback = V(c, "Feedback"), OrderIndex = Int(c, "OrderIndex", node.Choices.Count + 1) });
                    q.ScenarioNodes.Add(node);
                }
                ValidateQuestion(q, key, V(row, "_row"), errors);
                request.Questions.Add(q);
            }
            catch (Exception ex) when (ex is FormatException or ArgumentException) { errors.Add(new("Questions", V(row, "_row"), $"{key}: {ex.Message}")); }
        }
        return new(errors.Count == 0 ? request : null, errors, sourceQuestions.Count);
    }
    private static void ValidateQuestion(CreateQuestionRequest q, string key, string row, List<ImportProblem> errors)
    {
        void Error(string message) => errors.Add(new("Questions", row, $"{key}: {message}"));
        var choices = q.Choices.Count;
        var correct = q.Choices.Count(x => x.IsCorrect);
        var audio = q.Media.Count(x => x.MediaType == QuestionMediaType.AUDIO);
        if (q.Choices.Any(x => string.IsNullOrWhiteSpace(x.ChoiceText))) Error("ChoiceText cannot be empty.");
        if (q.Media.Any(x => string.IsNullOrWhiteSpace(x.MediaUrl))) Error("MediaUrl cannot be empty.");
        if (q.ErrorRegions.Any(x => x.EndTimeMs <= x.StartTimeMs)) Error("Error region end must be after start.");
        if (q.Annotations.Any(x => x.EndIndex < x.StartIndex)) Error("Annotation EndIndex must be >= StartIndex.");
        switch (q.QuestionType)
        {
            case QuestionType.SINGLE_CHOICE: if (choices < 2 || correct != 1) Error("SINGLE_CHOICE needs >=2 choices and exactly 1 correct."); break;
            case QuestionType.MULTIPLE_CHOICE: if (choices < 2 || correct < 1) Error("MULTIPLE_CHOICE needs >=2 choices and >=1 correct."); break;
            case QuestionType.TRUE_FALSE: if (choices != 2 || correct != 1) Error("TRUE_FALSE needs exactly 2 choices and 1 correct."); break;
            case QuestionType.LISTEN_IDENTIFY_ERROR:
            case QuestionType.LISTEN_CLASSIFY: if (audio < 1 || choices < 2 || correct < 1) Error("Needs AUDIO and >=2 choices with correct answer."); break;
            case QuestionType.LISTEN_LOCATE_ERROR: if (audio < 1 || q.ErrorRegions.Count < 1) Error("Needs AUDIO and error region."); break;
            case QuestionType.AUDIO_COMPARISON: if (audio < 2 || choices < 2 || correct < 1) Error("Needs >=2 AUDIO and >=2 choices with correct answer."); break;
            case QuestionType.SCRIPT_ANNOTATION: if (q.Annotations.Count == 0) Error("Needs annotations."); break;
            case QuestionType.SCRIPT_WRITING: if (q.WritingConfig == null) Error("Needs WritingConfig."); break;
            case QuestionType.ARRANGE_SCRIPT: if (q.ArrangeItems.Count < 2 || q.ArrangeItems.Where(x => !x.IsDistractor).Select(x => x.CorrectOrder).Distinct().Count() != q.ArrangeItems.Count(x => !x.IsDistractor)) Error("Needs >=2 items with unique correct order."); break;
            case QuestionType.ERROR_CORRECTION_LAB: if (q.ErrorRegions.Count == 0 || (choices > 0 && (choices < 2 || correct < 1))) Error("Needs error regions; optional choices must have >=2 with a correct answer."); break;
            case QuestionType.SCENARIO_DECISION_TREE:
                var keys = q.ScenarioNodes.Select(x => x.ClientKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
                if (q.ScenarioNodes.Count < 2 || q.ScenarioNodes.Count(x => x.IsStartNode) != 1 || keys.Count != q.ScenarioNodes.Count || q.ScenarioNodes.Any(x => !x.IsEndNode && x.Choices.Count == 0) || q.ScenarioNodes.SelectMany(x => x.Choices).Any(x => x.NextNodeClientKey != null && !keys.Contains(x.NextNodeClientKey))) Error("Invalid scenario nodes, start node, choices or next node keys.");
                break;
        }
        if (q.WritingConfig != null && q.WritingConfig.MinWords > q.WritingConfig.MaxWords) Error("WritingConfig MinWords > MaxWords.");
    }
    public async Task<QuizDto> ImportAsync(Dictionary<string, List<Dictionary<string, string>>> data, int courseId, int lessonId, string title, int instructorId, CancellationToken ct)
    {
        var preview = await PreviewAsync(data, courseId, lessonId, title, instructorId, ct);
        if (!preview.CanImport) throw new ArgumentException(string.Join(" | ", preview.Errors.Select(x => $"{x.Sheet} row {x.Row}: {x.Message}")));
        return await quizService.CreateQuizAsync(instructorId, preview.Quiz!) ?? throw new InvalidOperationException("Quiz creation returned null.");
    }
}
