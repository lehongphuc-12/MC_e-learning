using System.Net.Http.Headers;
using System.Text.Json;
using MC_BE.Core.Entities;
using MC_BE.Features.VoiceAssessment.DTOs;
using MC_BE.Features.VoiceAssessment.DTOs.Internal;
using MC_BE.Features.VoiceAssessment.Prompts;
using MC_BE.Features.VoiceAssessment.Providers.Interfaces;
using MC_BE.Features.VoiceAssessment.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MC_BE.Features.VoiceAssessment.Services;

public class AIResponseService : IAIResponseService
{
    private readonly SmartMcDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILLMProvider _llmProvider;
    private readonly VoiceAssessmentAISettings _aiSettings;
    private readonly OpenAISettings _openAISettings;
    private readonly ILogger<AIResponseService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly string[] RequiredLabels =
    {
        "PRON_INITIAL",
        "PRON_VOWEL",
        "PRON_FINAL",
        "PRON_TONE"
    };

    public AIResponseService(
        SmartMcDbContext db,
        IHttpClientFactory httpClientFactory,
        ILLMProvider llmProvider,
        IOptions<VoiceAssessmentAISettings> aiOptions,
        IOptions<OpenAISettings> openAIOptions,
        ILogger<AIResponseService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _llmProvider = llmProvider;
        _aiSettings = aiOptions.Value;
        _openAISettings = openAIOptions.Value;
        _logger = logger;
    }

    public async Task<AIResponseResult> GenerateFeedbackAsync(
        int submissionId,
        int learnerId,
        AIResponseRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. Kiểm tra bài nộp và quyền sở hữu.

        var submission = await _db.SpeakingSubmissions
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.SubmissionId == submissionId &&
                     x.LearnerId == learnerId,
                cancellationToken);

        if (submission == null)
        {
            throw new KeyNotFoundException(
                "Không tìm thấy bài luyện nói hoặc bạn không có quyền truy cập.");
        }

        if (string.IsNullOrWhiteSpace(submission.AudioUrl))
        {
            throw new InvalidOperationException(
                "Bài nộp chưa có tệp âm thanh.");
        }

        // 2. Tải âm thanh từ nơi lưu trữ.

        var audioBytes = await DownloadAudioAsync(
            submission.AudioUrl,
            cancellationToken);

        // 3. Gọi Python V4-B.

        var analysis = await AnalyzeAudioAsync(
            audioBytes,
            submission.AudioUrl,
            cancellationToken);

        ValidateAnalysis(analysis);

        // 4. Tạo Prompt.

       
        // 4. Chuẩn hóa dữ liệu đầu vào.
        // Giai đoạn 1 chưa tích hợp Speech-to-Text.

        var expectedText = string.IsNullOrWhiteSpace(request.ExpectedText)
            ? null
            : request.ExpectedText.Trim();

        string? transcriptText = null;

        // 5. Tạo Prompt tiếng Việt.
        var systemPrompt =
            PronunciationFeedbackPrompt.GetSystemPrompt();

        var userPrompt =
            PronunciationFeedbackPrompt.BuildUserPrompt(
                analysis,
                expectedText,
                transcriptText);

        // 6. Gọi GPT-6-Luna.
        var llmResponse = await _llmProvider.GenerateAsync(
            systemPrompt,
            userPrompt,
            cancellationToken);

        if (string.IsNullOrWhiteSpace(llmResponse))
        {
            throw new InvalidOperationException(
                "GPT-6-Luna không trả về nội dung phản hồi.");
        }

        _logger.LogInformation(
            "GPT-6-Luna response received for Submission {SubmissionId}. Length: {Length}",
            submissionId,
            llmResponse.Length);

        // 7. Deserialize JSON.
        LLMFeedbackDto? feedback;

        try
        {
            var cleanedResponse = llmResponse.Trim();

            if (cleanedResponse.StartsWith("```"))
            {
                cleanedResponse =
                    System.Text.RegularExpressions.Regex.Replace(
                        cleanedResponse,
                        @"^```(?:json)?\s*|\s*```$",
                        "",
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase
                    ).Trim();
            }

            feedback = JsonSerializer.Deserialize<LLMFeedbackDto>(
                cleanedResponse,
                JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogError(
                ex,
                "Invalid JSON from GPT-6-Luna for Submission {SubmissionId}",
                submissionId);

            throw new InvalidOperationException(
                "Không thể xử lý cấu trúc JSON từ AI.");
        }

        if (feedback == null)
        {
            throw new InvalidOperationException(
                "GPT-6-Luna không trả về phản hồi hợp lệ.");
        }

        ValidateFeedback(feedback, submissionId);



        // 7. Chuẩn bị dữ liệu lưu trữ.

        var now = DateTime.UtcNow;

        var predictionJson = JsonSerializer.Serialize(
            analysis,
            JsonOptions);

        var feedbackJson = JsonSerializer.Serialize(
            feedback,
            JsonOptions);

        // 8. Lưu hoặc cập nhật kết quả AI.

        var existingFeedback = await _db.Set<AIPronunciationFeedback>()
            .FirstOrDefaultAsync(
                x => x.SubmissionId == submissionId &&
                     x.LearnerId == learnerId,
                cancellationToken);

        if (existingFeedback == null)
        {
            existingFeedback = new AIPronunciationFeedback
            {
                SubmissionId = submissionId,
                LearnerId = learnerId,
                CreatedAt = now
            };

            _db.Set<AIPronunciationFeedback>()
                .Add(existingFeedback);
        }

        existingFeedback.ModelVersion = analysis.ModelVersion;
        existingFeedback.CheckpointEpoch = analysis.CheckpointEpoch;
        existingFeedback.LLMProvider = "STU AI Portal";
        existingFeedback.LLMModel = _openAISettings.Model;
        existingFeedback.PredictionJson = predictionJson;
        existingFeedback.FeedbackJson = feedbackJson;
        existingFeedback.Summary = feedback.Summary;
        existingFeedback.ExpectedText = request.ExpectedText;
        existingFeedback.TranscriptText = null; // Giai đoạn 1 chưa tích hợp Speech-to-Text.
        existingFeedback.UpdatedAt = now;

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "AI feedback saved for Submission {SubmissionId}, Feedback {FeedbackId}",
            submissionId,
            existingFeedback.FeedbackId);

        // 9. Trả dữ liệu cho Controller.

        return MapResult(
            existingFeedback,
            analysis,
            feedback);
    }

    private async Task<byte[]> DownloadAudioAsync(
        string audioUrl,
        CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(
                audioUrl,
                UriKind.Absolute,
                out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps &&
             uri.Scheme != Uri.UriSchemeHttp))
        {
            throw new InvalidOperationException(
                "Đường dẫn âm thanh không hợp lệ.");
        }

        var client = _httpClientFactory.CreateClient("AudioSource");

        using var response = await client.GetAsync(
            uri,
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                "Không thể tải tệp âm thanh từ hệ thống lưu trữ.");
        }

        var contentLength = response.Content.Headers.ContentLength;

        if (contentLength.HasValue &&
            contentLength.Value > _aiSettings.MaxUploadBytes)
        {
            throw new InvalidOperationException(
                "Tệp âm thanh vượt quá giới hạn cho phép.");
        }

        await using var input = await response.Content.ReadAsStreamAsync(
            cancellationToken);

        using var output = new MemoryStream();

        var buffer = new byte[81920];
        int bytesRead;

        while ((bytesRead = await input.ReadAsync(
                   buffer,
                   cancellationToken)) > 0)
        {
            if (output.Length + bytesRead >
                _aiSettings.MaxUploadBytes)
            {
                throw new InvalidOperationException(
                    "Tệp âm thanh vượt quá giới hạn cho phép.");
            }

            await output.WriteAsync(
                buffer.AsMemory(0, bytesRead),
                cancellationToken);
        }

        if (output.Length == 0)
        {
            throw new InvalidOperationException(
                "Tệp âm thanh không có dữ liệu.");
        }

        return output.ToArray();
    }

    private async Task<PronunciationAnalysisDto> AnalyzeAudioAsync(
        byte[] audioBytes,
        string audioUrl,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient(
            "VoiceAssessmentAI");

        using var form = new MultipartFormDataContent();

        var audioContent = new ByteArrayContent(audioBytes);

        var extension = Path.GetExtension(
            new Uri(audioUrl).AbsolutePath).ToLowerInvariant();

        var mimeType = extension switch
        {
            ".flac" => "audio/flac",
            ".wav" => "audio/wav",
            _ => "application/octet-stream"
        };

        audioContent.Headers.ContentType =
            new MediaTypeHeaderValue(mimeType);

        var fileName = extension is ".wav" or ".flac"
            ? $"submission{extension}"
            : "submission.wav";

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



    private static AIResponseResult MapResult(
        AIPronunciationFeedback entity,
        PronunciationAnalysisDto analysis,
        LLMFeedbackDto feedback)
    {
        return new AIResponseResult
        {
            FeedbackId = entity.FeedbackId,
            SubmissionId = entity.SubmissionId,
            ModelVersion = entity.ModelVersion,
            CheckpointEpoch = entity.CheckpointEpoch,
            Predictions = analysis.Predictions,

            OverallAssessment = feedback.OverallAssessment,
            Summary = feedback.Summary,

            Strengths = feedback.Strengths.Select(x =>
                new FeedbackItemResultDto
                {
                    Category = x.Category,
                    Explanation = x.Explanation,
                    Evidence = x.Evidence
                }).ToList(),

            Issues = feedback.Issues.Select(x =>
                new FeedbackItemResultDto
                {
                    Category = x.Category,
                    Explanation = x.Explanation,
                    Evidence = x.Evidence
                }).ToList(),

            Recommendations = feedback.Recommendations,

            PracticePlan = feedback.PracticePlan.Select(x =>
                new PracticeExerciseResultDto
                {
                    Title = x.Title,
                    Instruction = x.Instruction,
                    Example = x.Example
                }).ToList(),

            Encouragement = feedback.Encouragement,
            CreatedAt = entity.UpdatedAt
        };
    }
    
    // ============================================================
    // GET FEEDBACK - LEARNER
    // ============================================================

    public async Task<AIResponseResult> GetLearnerFeedbackAsync(
        int submissionId,
        int learnerId,
        CancellationToken cancellationToken = default)
    {
        // Kiểm tra bài nộp thuộc học viên đang đăng nhập.
        var hasAccess = await _db.SpeakingSubmissions
            .AsNoTracking()
            .AnyAsync(
                x => x.SubmissionId == submissionId &&
                     x.LearnerId == learnerId,
                cancellationToken);

        if (!hasAccess)
        {
            throw new KeyNotFoundException(
                "Không tìm thấy bài nộp hoặc bạn không có quyền truy cập.");
        }

        return await LoadSavedFeedbackAsync(
            submissionId,
            learnerId,
            cancellationToken);
    }

    // ============================================================
    // GET FEEDBACK - INSTRUCTOR
    // ============================================================

    public async Task<AIResponseResult> GetInstructorFeedbackAsync(
        int submissionId,
        int instructorId,
        CancellationToken cancellationToken = default)
    {
        // Xác minh giảng viên thực sự phụ trách khóa học.
        // SpeakingSubmission -> Lesson -> Course -> InstructorId.

        var hasAccess = await _db.SpeakingSubmissions
            .AsNoTracking()
            .AnyAsync(
                x => x.SubmissionId == submissionId &&
                     x.Lesson.Course.InstructorId == instructorId,
                cancellationToken);

        if (!hasAccess)
        {
            throw new KeyNotFoundException(
                "Không tìm thấy bài nộp hoặc bạn không phụ trách khóa học này.");
        }

        return await LoadSavedFeedbackAsync(
            submissionId,
            null,
            cancellationToken);
    }

    // ============================================================
    // LOAD SAVED AI FEEDBACK
    // ============================================================

    private async Task<AIResponseResult> LoadSavedFeedbackAsync(
        int submissionId,
        int? learnerId,
        CancellationToken cancellationToken)
    {
        var query = _db.Set<AIPronunciationFeedback>()
            .AsNoTracking()
            .Where(x => x.SubmissionId == submissionId);

        if (learnerId.HasValue)
        {
            query = query.Where(
                x => x.LearnerId == learnerId.Value);
        }

        var entity = await query.FirstOrDefaultAsync(
            cancellationToken);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Bài nộp chưa có kết quả đánh giá AI.");
        }

        try
        {
            var analysis =
                JsonSerializer.Deserialize<PronunciationAnalysisDto>(
                    entity.PredictionJson,
                    JsonOptions);

            var feedback =
                JsonSerializer.Deserialize<LLMFeedbackDto>(
                    entity.FeedbackJson,
                    JsonOptions);

            if (analysis == null || feedback == null)
            {
                throw new JsonException(
                    "Dữ liệu đánh giá AI không đầy đủ.");
            }

            ValidateAnalysis(analysis);
            ValidateFeedback(feedback, submissionId);

            return MapResult(
                entity,
                analysis,
                feedback);
        }
        catch (JsonException ex)
        {
            _logger.LogError(
                ex,
                "Saved AI feedback is invalid for Submission {SubmissionId}",
                submissionId);

            throw new InvalidOperationException(
                "Dữ liệu đánh giá AI đã lưu không hợp lệ.",
                ex);
        }
    }

}