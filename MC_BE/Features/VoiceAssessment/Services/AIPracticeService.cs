using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.VoiceAssessment.DTOs;
using MC_BE.Features.VoiceAssessment.DTOs.Internal;
using MC_BE.Features.VoiceAssessment.Prompts;
using MC_BE.Features.VoiceAssessment.Providers.Interfaces;
using MC_BE.Features.VoiceAssessment.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MC_BE.Features.VoiceAssessment.Services;



// Dịch vụ mới hoàn toàn. KHÔNG thay AIResponseService cũ.
public sealed class AIPracticeService : IAIPracticeService
{
    private readonly SmartMcDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILLMProvider _llmProvider;
    private readonly IAsrService _asrService;
    private readonly VoiceAssessmentAISettings _aiSettings;
    private readonly OpenAISettings _openAISettings;
    private readonly ILogger<AIPracticeService> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly string[] RequiredLabels = { "PRON_INITIAL", "PRON_VOWEL", "PRON_FINAL", "PRON_TONE" };
    public AIPracticeService(SmartMcDbContext db, IHttpClientFactory httpClientFactory,
        ILLMProvider llmProvider, IOptions<VoiceAssessmentAISettings> aiOptions,
        IOptions<OpenAISettings> openAIOptions, ILogger<AIPracticeService> logger,
        IAsrService asrService)
    {
        _db = db; _httpClientFactory = httpClientFactory; _llmProvider = llmProvider;
        _aiSettings = aiOptions.Value; _openAISettings = openAIOptions.Value; _logger = logger;
        _asrService = asrService;
    }
private const double C01PassingScore = 70.0;
private const double C02PassingScore = 70.0;
private const double C03PassingScore = 80.0;

private static List<PracticeCriterionResultDto> BuildCriteria(
    PronunciationAnalysisDto analysis,
    string? expectedText)
{
    var criteria = new List<PracticeCriterionResultDto>();

    // =========================
    // C01 - Phát âm & thanh điệu
    // =========================
    bool c01Available =
        string.Equals(
            analysis.ModelVersion,
            "V4-B",
            StringComparison.OrdinalIgnoreCase)
        && analysis.Predictions != null
        && RequiredLabels.All(label =>
            analysis.Predictions.TryGetValue(label, out var value)
            && !double.IsNaN(value)
            && !double.IsInfinity(value)
            && value >= 0
            && value <= 1);

    double? c01Score = null;

    if (c01Available)
    {
        double meanErrorSignal = RequiredLabels
            .Average(label => analysis.Predictions[label]);

        c01Score = Math.Round(
            (1.0 - meanErrorSignal) * 100.0,
            2);
    }

    criteria.Add(new PracticeCriterionResultDto
    {
        Code = "C01",
        Name = "Phát âm & thanh điệu",
        EvidenceAvailable = c01Available,
        Score = c01Score,
        PassingScore = C01PassingScore,
        Status = GetCriterionStatus(
            c01Score,
            C01PassingScore),
        ScoreDescription = c01Available
            ? "Điểm thử nghiệm từ trung bình 4 tín hiệu dự đoán lỗi của V4-B; chưa được hiệu chuẩn."
            : "Không có dữ liệu C01 hợp lệ."
    });

    // =========================
    // C02 - Độ rõ lời
    // =========================
    var clarity = analysis.Clarity;

    bool c02Available =
        clarity != null
        && !double.IsNaN(clarity.Score)
        && !double.IsInfinity(clarity.Score)
        && clarity.Score >= 1.0
        && clarity.Score <= 5.0;

    double? c02Score = c02Available
        ? Math.Round(
            (clarity!.Score - 1.0) / 4.0 * 100.0,
            2)
        : null;

    criteria.Add(new PracticeCriterionResultDto
    {
        Code = "C02",
        Name = "Độ rõ lời",
        EvidenceAvailable = c02Available,
        RawScore = c02Available ? clarity!.Score : null,
        Score = c02Score,
        PassingScore = C02PassingScore,
        Status = GetCriterionStatus(
            c02Score,
            C02PassingScore),
        ScoreDescription = c02Available
            ? "Điểm Ridge quy đổi tuyến tính từ thang 1–5 sang thang 100."
            : "Không có dữ liệu C02 hợp lệ."
    });

    // =========================
    // C03 - Độ chính xác nội dung
    // =========================
    var alignment = AlignContent(
        expectedText,
        analysis.Transcript);

    double? c03Score = null;
    double? wer = null;

    if (alignment != null && alignment.Expected.Count > 0)
    {
        int errors = alignment.Edits.Count;
        int total = alignment.Expected.Count;

        wer = (double)errors / total;

        c03Score = Math.Round(
            Math.Max(0.0, 1.0 - wer.Value) * 100.0,
            2);
    }

    criteria.Add(new PracticeCriterionResultDto
    {
        Code = "C03",
        Name = "Độ chính xác nội dung",
        EvidenceAvailable = c03Score.HasValue,
        Score = c03Score,
        PassingScore = C03PassingScore,
        Status = GetCriterionStatus(
            c03Score,
            C03PassingScore),
        ScoreDescription = wer.HasValue
            ? $"Đối chiếu văn bản ASR với bài mẫu; WER = {wer.Value * 100.0:0.##}%. Kết quả có thể chịu ảnh hưởng của lỗi ASR."
            : "Chưa có đủ văn bản để đối chiếu."
    });

    return criteria;
}

private static string GetCriterionStatus(
    double? score,
    double passingScore)
{
    if (!score.HasValue)
        return "NOT_EVALUATED";

    return score.Value >= passingScore
        ? "PASSED"
        : "FAILED";
}
    public async Task<AIPracticeResult> AnalyzeAsync(int practiceSessionId, int learnerId,
        byte[] audio, string extension, CancellationToken ct)
    {
        var session = await _db.Set<AIPracticeSession>().FirstOrDefaultAsync(
            x => x.PracticeSessionId == practiceSessionId && x.LearnerId == learnerId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên luyện tập.");
        if (session.Status != "PENDING")
            throw new InvalidOperationException("Phiên luyện tập không ở trạng thái chờ phân tích.");
        session.Status = "PROCESSING";
        session.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        try
        {
            // C02 and C03 are independent of C01; do not let a C01 failure block them.
            SpeechClarityDto? clarity = null;
            try { clarity = await AnalyzeClarityAsync(audio, extension, ct); }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception clarityEx)
            {
                _logger.LogWarning(clarityEx, "C02 thất bại cho phiên {Id}.", practiceSessionId);
            }

            PronunciationAnalysisDto? analysis = null;
            try { analysis = await AnalyzeAudioAsync(audio, extension, ct); }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception c01Ex)
            {
                _logger.LogWarning(c01Ex, "C01 không khả dụng cho phiên {Id}; giữ kết quả C02/C03.", practiceSessionId);
            }
            // ASR chỉ bổ sung bằng chứng văn bản; nếu dịch vụ lỗi, V4-B vẫn hoạt động.
            string? transcript = null;
            try
            {
                transcript = await _asrService.TranscribeAsync(audio, extension, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception asrEx)
            {
                _logger.LogWarning(asrEx,
                    "ASR thất bại cho phiên {Id}; tiếp tục đánh giá bằng V4-B.", practiceSessionId);
            }

            if (analysis == null && clarity == null && string.IsNullOrWhiteSpace(transcript))
                throw new InvalidOperationException("Cả C01, C02 và C03 đều không khả dụng.");

            // Do not invent C01 scores if it is unavailable.
            analysis ??= new PronunciationAnalysisDto
            {
                ModelVersion = "C02-C03-ONLY",
                SampleRate = 16000,
                Predictions = new Dictionary<string, double>()
            };
            analysis.Clarity = clarity;
            analysis.Transcript = transcript;

            // Chỉ chặn phản hồi phát âm khi hai nội dung khác biệt rất rõ.
            // Đây là kiểm tra văn bản ASR, KHÔNG phải kết luận người học đọc sai.
            var alignment = AlignContent(session.ExpectedText, transcript);
            var contentMismatch = alignment?.ClearMismatch == true;
            LLMFeedbackDto feedback;
            if (contentMismatch)
            {
                _logger.LogInformation(
                    "Phiên {Id}: nội dung ASR khác rõ rệt so với văn bản mẫu; " +
                    "không yêu cầu LLM suy diễn lỗi phát âm.", practiceSessionId);
                feedback = BuildContentMismatchFeedback(session.ExpectedText!, transcript!);
            }
            else if (analysis.ModelVersion == "C02-C03-ONLY")
            {
                feedback = BuildReferenceOnlyFeedback(clarity, transcript);
            }
            else
            {
                var prompt = PronunciationFeedbackPrompt.BuildUserPrompt(
                    analysis, session.ExpectedText, transcript);
                var raw = await _llmProvider.GenerateAsync(
                    PronunciationFeedbackPrompt.GetSystemPrompt(), prompt, ct);
                if (string.IsNullOrWhiteSpace(raw))
                    throw new InvalidOperationException("LLM không trả về kết quả.");
                var cleaned = raw.Trim();
                if (cleaned.StartsWith("```"))
                    cleaned = System.Text.RegularExpressions.Regex.Replace(cleaned,
                        @"^```(?:json)?\s*|\s*```$", "",
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
                feedback = JsonSerializer.Deserialize<LLMFeedbackDto>(cleaned, JsonOptions)
                    ?? throw new InvalidOperationException("Phản hồi AI không hợp lệ.");
                // Không để LLM tự gán lỗi theo từ: vị trí đối chiếu do thuật toán xác định.
                if (alignment != null)
                {
                    feedback.Issues = BuildAlignmentIssues(alignment, session.ExpectedText);
                    feedback.Strengths = new List<FeedbackItemDto>();
                }
            }
            // Chốt bằng chứng tại Backend: V4-B chỉ có tín hiệu toàn đoạn, ASR chỉ là văn bản.
            // Không cho phản hồi của LLM tự biến mẹo luyện thành lỗi đã được xác nhận.
            if (!contentMismatch && analysis.ModelVersion != "C02-C03-ONLY")
                ApplyEvidenceGuard(feedback, alignment, session.ExpectedText);
            // Chuẩn hóa phần tổng quan ở mọi nhánh (LLM / ContentMismatch / ReferenceOnly).
            // Chưa có ngưỡng đã xác thực nên tuyệt đối không gán PASSED/FAILED.
            ApplyThreeCriteriaOverview(
    feedback,
    analysis,
    clarity,
    transcript,
    contentMismatch,
    session.ExpectedText);
            ValidateFeedback(feedback, practiceSessionId);
            var record = new AIPracticeFeedback
            {
                PracticeSessionId = practiceSessionId, LearnerId = learnerId,
                ModelVersion = analysis.ModelVersion, CheckpointEpoch = analysis.CheckpointEpoch,
                LLMProvider = contentMismatch ? "ContentValidation" :
                    analysis.ModelVersion == "C02-C03-ONLY" ? "ReferenceOnly" : "STU AI Portal",
                LLMModel = contentMismatch || analysis.ModelVersion == "C02-C03-ONLY" ? "RuleBased" : _openAISettings.Model,
                PredictionJson = JsonSerializer.Serialize(analysis, JsonOptions),
                FeedbackJson = JsonSerializer.Serialize(feedback, JsonOptions),
                Summary = feedback.Summary, ExpectedText = session.ExpectedText
            };
            _db.Set<AIPracticeFeedback>().Add(record);
            session.Status = "COMPLETED";
            session.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return Map(session, record, analysis, feedback);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            session.Status = "FAILED";
            session.ErrorMessage = "Không thể phân tích âm thanh.";
            session.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(CancellationToken.None);
            _logger.LogError(ex, "Phân tích AI thất bại cho phiên {Id}", practiceSessionId);
            throw;
        }
    }

    // Căn chỉnh theo tiếng (các token cách nhau bởi khoảng trắng) bằng Levenshtein.
    // Đây là so sánh văn bản ASR, KHÔNG phải bộ chấm lỗi phát âm.
    private sealed record TextEdit(string Kind, int ExpectedIndex, string? Expected, string? Recognized);
    private sealed record ContentAlignment(List<string> Expected, List<string> Recognized,
        List<TextEdit> Edits, int Matches, bool ClearMismatch);

    private static ContentAlignment? AlignContent(string? expectedText, string? transcript)
    {
        if (string.IsNullOrWhiteSpace(expectedText) || string.IsNullOrWhiteSpace(transcript))
            return null;

        var a = ExtractWords(expectedText);
        var b = ExtractWords(transcript);
        if (a.Count == 0 || b.Count == 0) return null;

        // Giới hạn tài nguyên khi người dùng gửi văn bản rất dài.
        if (a.Count > 500 || b.Count > 500) return null;
        int n = a.Count, m = b.Count;
        var d = new int[n + 1, m + 1];
        for (int i = 0; i <= n; i++) d[i, 0] = i;
        for (int j = 0; j <= m; j++) d[0, j] = j;
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= m; j++)
            {
                int cost = a[i - 1] == b[j - 1] ? 0 : 1;
                d[i, j] = Math.Min(d[i - 1, j - 1] + cost,
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1));
            }

        int x = n, y = m, matches = 0;
        var edits = new List<TextEdit>();
        while (x > 0 || y > 0)
        {
            if (x > 0 && y > 0 && a[x - 1] == b[y - 1]
                && d[x, y] == d[x - 1, y - 1])
            {
                matches++; x--; y--; continue;
            }
            if (x > 0 && y > 0 && d[x, y] == d[x - 1, y - 1] + 1)
            {
                edits.Add(new TextEdit("Thay thế", x, a[x - 1], b[y - 1]));
                x--; y--; continue;
            }
            if (x > 0 && d[x, y] == d[x - 1, y] + 1)
            {
                edits.Add(new TextEdit("Thiếu", x, a[x - 1], null));
                x--; continue;
            }
            edits.Add(new TextEdit("Thêm", x + 1, null, b[y - 1]));
            y--;
        }
        edits.Reverse();

        // Heuristic bảo thủ: nội dung dài, trùng rất ít và độ sai khác lớn.
        // Không phải điểm phát âm; cần hiệu chuẩn trên dữ liệu ASR tiếng Việt.
        bool mismatch = n >= 5 && m >= 5
            && (double)matches / Math.Min(n, m) < 0.20
            && (double)d[n, m] / Math.Max(n, m) > 0.70;
        return new ContentAlignment(a, b, edits, matches, mismatch);
    }

    private static List<string> ExtractWords(string text) =>
        System.Text.RegularExpressions.Regex.Matches(
            text.ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormC),
            @"[\p{L}\p{M}\p{N}]+")
        .Select(match => match.Value).ToList();

    // Lấy ngữ cảnh trực tiếp từ ExpectedText gốc, không dựa vào LLM để đoán câu.
    // Dấu **...** chỉ đánh dấu tiếng trong văn bản, không xác nhận lỗi phát âm.
    private static string? GetExpectedContext(string? expectedText, TextEdit edit)
    {
        if (string.IsNullOrWhiteSpace(expectedText)) return null;

        var text = expectedText.Normalize(System.Text.NormalizationForm.FormC);
        var tokens = System.Text.RegularExpressions.Regex.Matches(
            text, @"[\p{L}\p{M}\p{N}]+");
        if (tokens.Count == 0) return null;

        // TextEdit dùng chỉ số tiếng 1-based. Với tiếng ASR thêm, chỉ số
        // biểu thị vị trí chèn trước tiếng đó (có thể là cuối bài + 1).
        bool isInsertion = edit.Kind == "Thêm";
        int tokenIndex = isInsertion
            ? Math.Clamp(edit.ExpectedIndex - 1, 0, tokens.Count - 1)
            : edit.ExpectedIndex - 1;
        if (tokenIndex < 0 || tokenIndex >= tokens.Count) return null;

        var target = tokens[tokenIndex];
        int sentenceStart = 0;
        int sentenceEnd = text.Length;
        bool hasSentenceBoundary = false;

        // Xác định câu theo dấu kết thúc câu hoặc xuống dòng.
        for (int i = target.Index - 1; i >= 0; i--)
        {
            if (IsSentenceBoundary(text[i]))
            {
                sentenceStart = i + 1;
                hasSentenceBoundary = true;
                break;
            }
        }
        for (int i = target.Index + target.Length; i < text.Length; i++)
        {
            if (IsSentenceBoundary(text[i]))
            {
                sentenceEnd = i + 1;
                hasSentenceBoundary = true;
                break;
            }
        }

        // Văn bản không có ranh giới câu: chỉ lấy tối đa 7 tiếng mỗi phía.
        if (!hasSentenceBoundary)
        {
            int from = Math.Max(0, tokenIndex - 7);
            int to = Math.Min(tokens.Count - 1, tokenIndex + 7);
            sentenceStart = tokens[from].Index;
            sentenceEnd = tokens[to].Index + tokens[to].Length;
        }

        string context = text.Substring(sentenceStart, sentenceEnd - sentenceStart).Trim();
        if (context.Length == 0) return null;
        if (isInsertion) return context;

        // Chỉ đánh dấu đúng tiếng ở vị trí căn chỉnh, không thay thế các tiếng trùng khác.
        int relativeIndex = target.Index - sentenceStart;
        int trimOffset = text.Substring(sentenceStart, sentenceEnd - sentenceStart).Length
            - text.Substring(sentenceStart, sentenceEnd - sentenceStart).TrimStart().Length;
        relativeIndex -= trimOffset;
        if (relativeIndex < 0 || relativeIndex + target.Length > context.Length) return context;
        return context.Insert(relativeIndex + target.Length, "**").Insert(relativeIndex, "**");
    }

    private static bool IsSentenceBoundary(char c) =>
        c is '.' or '!' or '?' or '…' or '\n' or '\r' or ';';

    private static List<FeedbackItemDto> BuildAlignmentIssues(
        ContentAlignment alignment, string? expectedText)
    {
        // Khi nội dung chỉ trùng rất ít, vị trí căn chỉnh không đáng tin cậy.
        if (alignment.Matches < 2 ||
            (double)alignment.Matches / Math.Min(alignment.Expected.Count, alignment.Recognized.Count) < 0.50)
            return new List<FeedbackItemDto>();

        return alignment.Edits.Take(2).Select(edit =>
        {
            var context = GetExpectedContext(expectedText, edit);
            var contextLine = context == null ? "" : $"Câu/cụm trong bài mẫu: {context}\n";
            return new FeedbackItemDto
            {
                Category = "Vị trí cần nghe lại",
                Explanation = edit.Kind switch
                {
                    "Thay thế" => $"Tiếng thứ {edit.ExpectedIndex} có nội dung nhận dạng khác bài mẫu. Hãy nghe lại để kiểm tra.",
                    "Thiếu" => $"Bản chép lời chưa thể hiện tiếng thứ {edit.ExpectedIndex} của bài mẫu. Hãy nghe lại để kiểm tra.",
                    _ => $"Bản chép lời có thêm một tiếng gần vị trí {edit.ExpectedIndex}. Hãy nghe lại để kiểm tra."
                },
                Evidence = contextLine + (edit.Kind switch
                {
                    "Thay thế" => $"Bài mẫu: “{edit.Expected}”; bản chép lời: “{edit.Recognized}”.",
                    "Thiếu" => $"Bài mẫu có “{edit.Expected}”; bản chép lời không có tiếng tương ứng.",
                    _ => $"Bản chép lời có thêm “{edit.Recognized}”."
                })
            };
        }).ToList();
    }

    // Không có bộ kiểm chứng âm học theo âm tiết trong pipeline hiện tại.
    // Vì vậy chỉ có SUSPECTED (khác biệt ASR) và PRACTICE_TIP (bài luyện tham khảo).
    // CONFIRMED phải để dành cho một bộ xác minh âm học đã được kiểm chứng sau này.
    private static void ApplyEvidenceGuard(
        LLMFeedbackDto feedback, ContentAlignment? alignment, string? expectedText)
    {
        feedback.Strengths = new List<FeedbackItemDto>();
        feedback.Issues = alignment == null
            ? new List<FeedbackItemDto>()
            : BuildAlignmentIssues(alignment, expectedText);

        // Không ghi đè OverallAssessment/Summary do LLM tạo: phần tổng quan
        // sẽ được chuẩn hóa cho cả ba tiêu chí tại ApplyThreeCriteriaOverview.
        // Vẫn giữ quyền kiểm soát bằng chứng của backend đối với strengths/issues.

        // Giữ recommendations/practicePlan của LLM để phản hồi được cá nhân hóa.
        // Nếu LLM không tạo đủ bài tập, fallback an toàn từ bài mẫu.
        var words = string.IsNullOrWhiteSpace(expectedText)
            ? new List<string>() : ExtractWords(expectedText);
        if (feedback.Recommendations == null || feedback.Recommendations.Count == 0)
            feedback.Recommendations = new List<string>
            {
                "Nghe lại bản ghi và đối chiếu với bài mẫu theo từng cụm.",
                "Đọc chậm từng cụm, sau đó nối thành câu với nhịp tự nhiên."
            };
        if ((feedback.PracticePlan == null || feedback.PracticePlan.Count == 0) && words.Count > 0)
            feedback.PracticePlan = new List<PracticeExerciseDto>
            {
                new PracticeExerciseDto
                {
                    Title = "Luyện đọc theo cụm",
                    Instruction = "Đọc cụm mẫu 3 lượt, ghi âm và nghe lại để tự đối chiếu.",
                    Example = string.Join(" ", words.Take(Math.Min(4, words.Count)))
                },
                new PracticeExerciseDto
                {
                    Title = "Luyện nhịp đọc",
                    Instruction = "Đọc cụm mẫu 3 lượt ở tốc độ tự nhiên và kiểm tra nhịp ngắt nghỉ.",
                    Example = string.Join(" ", words.Skip(Math.Max(0, words.Count - 5)))
                }
            };
    }

    // Ba tiêu chí luôn xuất hiện, nhưng trạng thái đạt/chưa đạt chỉ được
    // hiển thị sau khi có rubric và ngưỡng được xác thực từ backend.
private static void ApplyThreeCriteriaOverview(
    LLMFeedbackDto feedback,
    PronunciationAnalysisDto analysis,
    SpeechClarityDto? clarity,
    string? transcript,
    bool contentMismatch,
    string? expectedText)
{
    var criteria = BuildCriteria(
        analysis,
        expectedText);

    string FormatCriterion(PracticeCriterionResultDto c)
    {
        if (!c.Score.HasValue)
        {
            return $"{c.Code} – {c.Name}: " +
                   "Chưa có dữ liệu để chấm điểm.";
        }

        string result = c.Status == "PASSED"
            ? "ĐẠT"
            : "CHƯA ĐẠT";

        return $"{c.Code} – {c.Name}: " +
               $"{c.Score.Value:0.##}/100 – {result}.";
    }

    int passed = criteria.Count(
        x => x.Status == "PASSED");

    int evaluated = criteria.Count(
        x => x.Status != "NOT_EVALUATED");

    string overallResult;

    if (evaluated < criteria.Count)
    {
        overallResult =
            $"Đã đánh giá {evaluated}/{criteria.Count} tiêu chí; " +
            "chưa đủ dữ liệu để kết luận toàn bài.";
    }
    else
    {
        overallResult = passed == criteria.Count
            ? $"Kết quả toàn bài: ĐẠT ({passed}/{criteria.Count} tiêu chí)."
            : $"Kết quả toàn bài: CHƯA ĐẠT ({passed}/{criteria.Count} tiêu chí đạt).";
    }

    feedback.OverallAssessment =
        string.Join(" ", criteria.Select(FormatCriterion))
        + " " + overallResult;

    if (contentMismatch)
    {
        feedback.Summary =
            "Bản chép lời khác đáng kể so với bài mẫu. " +
            "Điểm C03 phản ánh mức độ khớp văn bản nhận dạng, " +
            "không tự khẳng định người học đọc sai. " +
            "Hãy nghe lại bản ghi để kiểm tra.";
    }
    else if (string.IsNullOrWhiteSpace(feedback.Summary))
    {
        feedback.Summary =
            "Hệ thống đã phân tích bản ghi. " +
            "Hãy xem điểm từng tiêu chí và luyện tập theo gợi ý.";
    }
}

    private static LLMFeedbackDto BuildContentMismatchFeedback(
        string expectedText, string transcript)
    {
        // Phản hồi riêng cho trường hợp nội dung khác biệt lớn.
        // Không tạo điểm mạnh hay bài tập phát âm thiếu căn cứ.
        var payload = new
        {
            overallAssessment = "Bản ghi âm có nội dung khác rõ rệt so với bài đọc mẫu. Hãy kiểm tra lại trước khi tiếp tục luyện giọng.",
            summary = "Bạn có thể đã chọn nhầm bản ghi hoặc bản chép lời chưa chính xác. Hãy nghe lại âm thanh để xác nhận.",
            strengths = Array.Empty<object>(),
            issues = new[]
            {
                new
                {
                    category = "Đối chiếu nội dung bài đọc",
                    explanation = "Nội dung được nhận dạng khác đáng kể so với bài mẫu. Hãy nghe lại bản ghi để xác nhận trước khi đánh giá phát âm.",
                    evidence = $"Bài mẫu: “{expectedText}”; Bản chép lời: “{transcript}”."
                }
            },
            recommendations = new[]
            {
                "Mở lại bản ghi và kiểm tra xem đây có đúng là phần đọc của bài mẫu hay không.",
                "Nếu bạn đọc một nội dung khác, hãy cập nhật bài mẫu; nếu bản chép lời chưa đúng, hãy thử ghi âm lại ở nơi yên tĩnh."
            },
            practicePlan = Array.Empty<object>(),
            encouragement = "Khi bản ghi và bài mẫu đã khớp, bạn có thể tiếp tục luyện tập với những gợi ý sát nội dung hơn."
        };
        return JsonSerializer.Deserialize<LLMFeedbackDto>(
            JsonSerializer.Serialize(payload), JsonOptions)
            ?? throw new InvalidOperationException("Không thể tạo phản hồi kiểm tra nội dung.");
    }

    public async Task<AIPracticeResult> GetAsync(int practiceSessionId, CancellationToken ct)
    {
        var session = await _db.Set<AIPracticeSession>().AsNoTracking()
            .FirstOrDefaultAsync(x => x.PracticeSessionId == practiceSessionId, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên luyện tập.");
        var record = await _db.Set<AIPracticeFeedback>().AsNoTracking()
            .FirstOrDefaultAsync(x => x.PracticeSessionId == practiceSessionId, ct)
            ?? throw new KeyNotFoundException("Phiên luyện tập chưa có kết quả AI.");
        var analysis = JsonSerializer.Deserialize<PronunciationAnalysisDto>(record.PredictionJson, JsonOptions)
            ?? throw new InvalidOperationException("Dữ liệu phân tích không hợp lệ.");
        var feedback = JsonSerializer.Deserialize<LLMFeedbackDto>(record.FeedbackJson, JsonOptions)
            ?? throw new InvalidOperationException("Dữ liệu phản hồi không hợp lệ.");
            ApplyThreeCriteriaOverview(
    feedback,
    analysis,
    analysis.Clarity,
    analysis.Transcript,
    false,
    session.ExpectedText);
        return Map(session, record, analysis, feedback);
    }

    private static AIPracticeResult Map(
    AIPracticeSession s,
    AIPracticeFeedback r,
    PronunciationAnalysisDto a,
    LLMFeedbackDto f)
{
    var criteria = BuildCriteria(a, s.ExpectedText);

    return new AIPracticeResult
    {
        PracticeSessionId = s.PracticeSessionId,
        PracticeFeedbackId = r.PracticeFeedbackId,
        PracticeMode = s.PracticeMode,
        CourseId = s.CourseId,
        LessonId = s.LessonId,

        ModelVersion = r.ModelVersion,
        CheckpointEpoch = r.CheckpointEpoch,

        Predictions = a.Predictions,
        Clarity = a.Clarity,
        Transcript = a.Transcript,

        PronunciationAvailable =
            a.ModelVersion.Equals(
                "V4-B",
                StringComparison.OrdinalIgnoreCase),

        Criteria = criteria,

        PassedCriteriaCount = criteria.Count(
            x => x.Status == "PASSED"),

        EvaluatedCriteriaCount = criteria.Count(
            x => x.Status == "PASSED" ||
                 x.Status == "FAILED"),

        TotalCriteriaCount = criteria.Count,

        OverallAssessment = f.OverallAssessment,
        Summary = f.Summary,

        Strengths = f.Strengths.Select(x =>
            new FeedbackItemResultDto
            {
                Category = x.Category,
                Explanation = x.Explanation,
                Evidence = x.Evidence
            }).ToList(),

        Issues = f.Issues.Select(x =>
            new FeedbackItemResultDto
            {
                Category = x.Category,
                Explanation = x.Explanation,
                Evidence = x.Evidence
            }).ToList(),

        Recommendations = f.Recommendations,

        PracticePlan = f.PracticePlan.Select(x =>
            new PracticeExerciseResultDto
            {
                Title = x.Title,
                Instruction = x.Instruction,
                Example = x.Example
            }).ToList(),

        Encouragement = f.Encouragement,
        CreatedAt = r.CreatedAt
    };
}

    private async Task<SpeechClarityDto> AnalyzeClarityAsync(
        byte[] audio, string extension, CancellationToken ct)
    {
        extension = extension?.ToLowerInvariant() ?? "";
        if (extension is not (".wav" or ".flac"))
            throw new ArgumentException("C02 chỉ hỗ trợ WAV/FLAC.", nameof(extension));
        using var form = new MultipartFormDataContent();
        using var content = new ByteArrayContent(audio);
        content.Headers.ContentType = new MediaTypeHeaderValue(extension == ".wav" ? "audio/wav" : "audio/flac");
        form.Add(content, "file", "practice" + extension);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/c02/predict") { Content = form };
        if (!string.IsNullOrWhiteSpace(_aiSettings.ApiKey))
            request.Headers.Add("X-API-Key", _aiSettings.ApiKey);
        using var response = await _httpClientFactory.CreateClient("VoiceAssessmentAI")
            .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"C02 HTTP {(int)response.StatusCode}.");
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        var result = await JsonSerializer.DeserializeAsync<SpeechClarityDto>(stream, JsonOptions, ct)
            ?? throw new InvalidOperationException("C02 trả về JSON rỗng.");
        if (result.SampleRate != 16000 || double.IsNaN(result.Score) ||
            double.IsInfinity(result.Score) || result.Score < 1 || result.Score > 5 ||
            string.IsNullOrWhiteSpace(result.ModelVersion))
            throw new InvalidOperationException("Dữ liệu điểm C02 không hợp lệ.");
        return result;
    }

    private static LLMFeedbackDto BuildReferenceOnlyFeedback(SpeechClarityDto? clarity, string? transcript)
    {
        var summary = clarity != null
            ? $"Điểm độ rõ lời nói tham khảo: {clarity.Score:0.###}/5. "
            : "Chưa có điểm độ rõ lời nói. ";
        summary += "Chưa có kết quả C01 nên không thể kết luận lỗi phát âm.";
        return new LLMFeedbackDto
        {
            OverallAssessment = "Kết quả tham khảo (chưa có đánh giá phát âm C01)",
            Summary = summary,
            Strengths = new List<FeedbackItemDto>(),
            Issues = new List<FeedbackItemDto>(),
            Recommendations = new List<string>
            {
                "Nghe lại bản ghi và đối chiếu bản chép lời nếu có; ASR có thể nhận dạng sai.",
                "Thử lại đánh giá phát âm khi C01 hoạt động trở lại."
            },
            PracticePlan = new List<PracticeExerciseDto>(),
            Encouragement = "Bạn có thể tiếp tục luyện tập và ghi âm ở nơi yên tĩnh."
        };
    }

    private async Task<PronunciationAnalysisDto> AnalyzeAudioAsync(
        byte[] audioBytes,
        string extension,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient(
            "VoiceAssessmentAI");

        using var form = new MultipartFormDataContent();

        var audioContent = new ByteArrayContent(audioBytes);

        extension = extension.ToLowerInvariant();

        var mimeType = extension switch
        {
            ".flac" => "audio/flac",
            ".wav" => "audio/wav",
            _ => "application/octet-stream"
        };

        audioContent.Headers.ContentType =
            new MediaTypeHeaderValue(mimeType);

        var fileName = extension is ".wav" or ".flac"
            ? $"practice{extension}"
            : "practice.wav";

        form.Add(audioContent, "file", fileName);

        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            "/predict")
        {
            Content = form
        };

        if (!string.IsNullOrWhiteSpace(_aiSettings.ApiKey))
        {
            httpRequest.Headers.Add(
                "X-API-Key",
                _aiSettings.ApiKey);
        }


        using var response = await client.SendAsync(
            httpRequest,
            cancellationToken);

        var responseBody = await response.Content.ReadAsStringAsync(
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "V4-B API failed. Status: {StatusCode}, Response: {ResponseBody}",
                (int)response.StatusCode,
                responseBody);

            throw new HttpRequestException(
                $"V4-B trả về lỗi HTTP {(int)response.StatusCode}: {responseBody}");
        }

        PronunciationAnalysisDto? result;

        try
        {
            result = JsonSerializer.Deserialize<PronunciationAnalysisDto>(
                responseBody,
                JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Không thể đọc JSON từ V4-B.");

            throw new InvalidOperationException(
                "Phản hồi từ V4-B không đúng định dạng.",
                ex);
        }

        if (result == null)
        {
            throw new InvalidOperationException(
                "V4-B không trả về kết quả phân tích.");
        }

        ValidateAnalysis(result);

        return result;
    }

    private static void ValidateAnalysis(
        PronunciationAnalysisDto analysis)

    {
        if (!string.Equals(
                analysis.ModelVersion,
                "V4-B",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Phiên bản mô hình phân tích không hợp lệ.");
        }

        if (analysis.Predictions == null ||
            RequiredLabels.Any(
                label => !analysis.Predictions.ContainsKey(label)))
        {
            throw new InvalidOperationException(
                "Kết quả V4-B thiếu nhóm phân tích phát âm.");
        }

        foreach (var label in RequiredLabels)
        {
            var value = analysis.Predictions[label];

            if (double.IsNaN(value) ||
                double.IsInfinity(value) ||
                value < 0 ||
                value > 1)
            {
                throw new InvalidOperationException(
                    $"Giá trị dự đoán {label} không hợp lệ.");
            }
        }

        if (analysis.SampleRate != 16000)
        {
            throw new InvalidOperationException(
                "Sampling rate của kết quả phân tích không hợp lệ.");
        }
    }



private void ValidateFeedback(
    LLMFeedbackDto feedback,
    int submissionId)
{
    var missingFields = new List<string>();

    if (string.IsNullOrWhiteSpace(feedback.OverallAssessment))
        missingFields.Add("overallAssessment");

    if (string.IsNullOrWhiteSpace(feedback.Summary))
        missingFields.Add("summary");

    if (string.IsNullOrWhiteSpace(feedback.Encouragement))
        missingFields.Add("encouragement");

    if (feedback.Strengths == null)
        missingFields.Add("strengths");

    if (feedback.Issues == null)
        missingFields.Add("issues");

    if (feedback.Recommendations == null)
        missingFields.Add("recommendations");

    if (feedback.PracticePlan == null)
        missingFields.Add("practicePlan");

    if (missingFields.Count > 0)
    {
        _logger.LogError(
            "LLM returned incomplete feedback for Submission {SubmissionId}. Missing: {Fields}",
            submissionId,
            string.Join(", ", missingFields));

        throw new InvalidOperationException(
            $"Phản hồi AI thiếu thông tin: {string.Join(", ", missingFields)}.");
    }

    if (feedback.Strengths.Any(x =>
            x == null ||
            string.IsNullOrWhiteSpace(x.Category) ||
            string.IsNullOrWhiteSpace(x.Explanation)))
    {
        throw new InvalidOperationException(
            "Dữ liệu điểm mạnh trong phản hồi AI không hợp lệ.");
    }

    if (feedback.Issues.Any(x =>
            x == null ||
            string.IsNullOrWhiteSpace(x.Category) ||
            string.IsNullOrWhiteSpace(x.Explanation)))
    {
        throw new InvalidOperationException(
            "Dữ liệu vấn đề trong phản hồi AI không hợp lệ.");
    }

    if (feedback.PracticePlan.Any(x =>
            x == null ||
            string.IsNullOrWhiteSpace(x.Title) ||
            string.IsNullOrWhiteSpace(x.Instruction) ||
            string.IsNullOrWhiteSpace(x.Example)))
    {
        throw new InvalidOperationException(
            "Bài tập luyện phát âm do AI tạo không hợp lệ.");
    }
}
}
