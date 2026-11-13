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
    private readonly VoiceAssessmentAISettings _aiSettings;
    private readonly OpenAISettings _openAISettings;
    private readonly ILogger<AIPracticeService> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly string[] RequiredLabels = { "PRON_INITIAL", "PRON_VOWEL", "PRON_FINAL", "PRON_TONE" };
    public AIPracticeService(SmartMcDbContext db, IHttpClientFactory httpClientFactory,
        ILLMProvider llmProvider, IOptions<VoiceAssessmentAISettings> aiOptions,
        IOptions<OpenAISettings> openAIOptions, ILogger<AIPracticeService> logger)
    {
        _db = db; _httpClientFactory = httpClientFactory; _llmProvider = llmProvider;
        _aiSettings = aiOptions.Value; _openAISettings = openAIOptions.Value; _logger = logger;
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
            var analysis = await AnalyzeAudioAsync(audio, extension, ct);
            ValidateAnalysis(analysis);
            var prompt = PronunciationFeedbackPrompt.BuildUserPrompt(analysis, session.ExpectedText, null);
            var raw = await _llmProvider.GenerateAsync(PronunciationFeedbackPrompt.GetSystemPrompt(), prompt, ct);
            if (string.IsNullOrWhiteSpace(raw)) throw new InvalidOperationException("LLM không trả về kết quả.");
            var cleaned = raw.Trim();
            if (cleaned.StartsWith("```"))
                cleaned = System.Text.RegularExpressions.Regex.Replace(cleaned,
                    @"^```(?:json)?\s*|\s*```$", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
            var feedback = JsonSerializer.Deserialize<LLMFeedbackDto>(cleaned, JsonOptions)
                ?? throw new InvalidOperationException("Phản hồi AI không hợp lệ.");
            ValidateFeedback(feedback, practiceSessionId);
            var record = new AIPracticeFeedback
            {
                PracticeSessionId = practiceSessionId, LearnerId = learnerId,
                ModelVersion = analysis.ModelVersion, CheckpointEpoch = analysis.CheckpointEpoch,
                LLMProvider = "STU AI Portal", LLMModel = _openAISettings.Model,
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
        return Map(session, record, analysis, feedback);
    }

    private static AIPracticeResult Map(AIPracticeSession s, AIPracticeFeedback r,
        PronunciationAnalysisDto a, LLMFeedbackDto f) => new()
    {
        PracticeSessionId = s.PracticeSessionId, PracticeFeedbackId = r.PracticeFeedbackId,
        PracticeMode = s.PracticeMode, CourseId = s.CourseId, LessonId = s.LessonId,
        ModelVersion = r.ModelVersion, CheckpointEpoch = r.CheckpointEpoch,
        Predictions = a.Predictions, OverallAssessment = f.OverallAssessment,
        Summary = f.Summary,
        Strengths = f.Strengths.Select(x => new FeedbackItemResultDto
            { Category = x.Category, Explanation = x.Explanation, Evidence = x.Evidence }).ToList(),
        Issues = f.Issues.Select(x => new FeedbackItemResultDto
            { Category = x.Category, Explanation = x.Explanation, Evidence = x.Evidence }).ToList(),
        Recommendations = f.Recommendations,
        PracticePlan = f.PracticePlan.Select(x => new PracticeExerciseResultDto
            { Title = x.Title, Instruction = x.Instruction, Example = x.Example }).ToList(),
        Encouragement = f.Encouragement, CreatedAt = r.CreatedAt
    };

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
            "GPT-6-Luna returned incomplete feedback for Submission {SubmissionId}. Missing: {Fields}",
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
