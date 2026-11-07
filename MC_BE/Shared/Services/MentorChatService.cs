using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MC_BE.Shared.Services;

public class MentorChatService : IMentorChatService
{
    private readonly HttpClient _httpClient;
    private readonly MentorChatSettings _settings;
    private readonly ILogger<MentorChatService> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public MentorChatService(
        HttpClient httpClient,
        IOptions<MentorChatSettings> options,
        ILogger<MentorChatService> logger)
    {
        _httpClient = httpClient;
        _settings = options.Value;
        _logger = logger;

        var baseUrl = string.IsNullOrWhiteSpace(_settings.BaseUrl) ? "http://localhost:8000" : _settings.BaseUrl.TrimEnd('/');
        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds > 0 ? _settings.TimeoutSeconds : 60);
    }

    public async Task<MentorChatResponseDto> AskQuestionAsync(
        int courseId, 
        MentorChatRequestDto request, 
        CancellationToken ct = default)
    {
        var pythonPayload = new PythonChatRequest
        {
            CourseId = courseId,
            Message = request.Message,
            LessonId = request.LessonId,
            TopK = request.TopK > 0 ? request.TopK : 4
        };

        var json = JsonSerializer.Serialize(pythonPayload, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        _logger.LogInformation("Sending chat question for CourseId {CourseId}, LessonId {LessonId} to MentorChat AI...", courseId, request.LessonId);

        var response = await _httpClient.PostAsync("/api/chat", content, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("MentorChat service returned error status {StatusCode}: {ErrorBody}", response.StatusCode, responseBody);
            throw new HttpRequestException($"MentorChat AI failed ({response.StatusCode}): {responseBody}");
        }

        var result = JsonSerializer.Deserialize<MentorChatResponseDto>(responseBody, JsonOptions);
        return result ?? new MentorChatResponseDto
        {
            CourseId = courseId,
            Answer = "Không nhận được phản hồi hợp lệ từ AI Mentor."
        };
    }

    public async Task<MentorIngestResponseDto?> IngestTranscriptAsync(
        int courseId, 
        int lessonId, 
        string lessonTitle, 
        string transcriptText, 
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(transcriptText))
        {
            _logger.LogWarning("IngestTranscriptAsync called with empty transcript for Lesson {LessonId}, skipping.", lessonId);
            return null;
        }

        var payload = new TranscriptIngestRequestDto
        {
            CourseId = courseId,
            LessonId = lessonId,
            LessonTitle = lessonTitle,
            TranscriptText = transcriptText
        };

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        _logger.LogInformation("Ingesting transcript for Course {CourseId}, Lesson {LessonId} to MentorChat...", courseId, lessonId);

        var response = await _httpClient.PostAsync("/api/transcripts/ingest", content, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("MentorChat transcript ingestion failed with {StatusCode}: {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"MentorChat transcript ingestion failed ({response.StatusCode}): {responseBody}");
        }

        return JsonSerializer.Deserialize<MentorIngestResponseDto>(responseBody, JsonOptions);
    }

    public async Task<MentorIngestResponseDto?> IngestDocumentAsync(
        int courseId, 
        string fileName, 
        Stream fileStream, 
        int? lessonId = null, 
        CancellationToken ct = default)
    {
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(courseId.ToString()), "course_id");

        if (lessonId.HasValue)
        {
            form.Add(new StringContent(lessonId.Value.ToString()), "lesson_id");
        }

        var streamContent = new StreamContent(fileStream);
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var mimeType = extension switch
        {
            ".pdf" => "application/pdf",
            ".txt" => "text/plain",
            ".md" => "text/markdown",
            _ => "application/octet-stream"
        };
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(mimeType);
        form.Add(streamContent, "file", fileName);

        _logger.LogInformation("Uploading and indexing document {FileName} for Course {CourseId} in MentorChat...", fileName, courseId);

        var response = await _httpClient.PostAsync("/api/documents/upload", form, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("MentorChat document ingestion failed with {StatusCode}: {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"MentorChat document upload failed ({response.StatusCode}): {responseBody}");
        }

        return JsonSerializer.Deserialize<MentorIngestResponseDto>(responseBody, JsonOptions);
    }
}
