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
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.TimeoutSeconds > 0 ? _settings.TimeoutSeconds : 120);

        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            _httpClient.DefaultRequestHeaders.Remove("X-Internal-Api-Key");
            _httpClient.DefaultRequestHeaders.Add("X-Internal-Api-Key", _settings.ApiKey.Trim());
        }
    }

    public async Task<MentorChatResponseDto> AskQuestionAsync(
        int courseId, 
        MentorChatRequestDto request, 
        CancellationToken ct = default)
    {
        var safeTopK = Math.Clamp(request.TopK <= 0 ? 4 : request.TopK, 1, 12);
        var pythonPayload = new PythonChatRequest
        {
            CourseId = courseId,
            Message = request.Message,
            LessonId = request.LessonId,
            TopK = safeTopK
        };

        var json = JsonSerializer.Serialize(pythonPayload, JsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        _logger.LogInformation("Sending chat question for CourseId {CourseId}, LessonId {LessonId}, TopK {TopK} to MentorChat AI...", courseId, request.LessonId, safeTopK);

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

    public async Task StreamQuestionToResponseAsync(
        int courseId, 
        MentorChatRequestDto request, 
        Stream responseStream, 
        CancellationToken ct = default)
    {
        var safeTopK = Math.Clamp(request.TopK <= 0 ? 4 : request.TopK, 1, 12);
        var pythonPayload = new PythonChatRequest
        {
            CourseId = courseId,
            Message = request.Message,
            LessonId = request.LessonId,
            TopK = safeTopK
        };

        var json = JsonSerializer.Serialize(pythonPayload, JsonOptions);
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/chat/stream")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        _logger.LogInformation("Streaming chat question for CourseId {CourseId}, LessonId {LessonId} to MentorChat AI...", courseId, request.LessonId);

        using var response = await _httpClient.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("MentorChat streaming error ({StatusCode}): {Error}", response.StatusCode, err);
            throw new HttpRequestException($"MentorChat AI stream failed ({response.StatusCode}): {err}");
        }

        using var sourceStream = await response.Content.ReadAsStreamAsync(ct);
        var buffer = new byte[4096];
        int bytesRead;
        while ((bytesRead = await sourceStream.ReadAsync(buffer, 0, buffer.Length, ct)) > 0)
        {
            await responseStream.WriteAsync(buffer.AsMemory(0, bytesRead), ct);
            await responseStream.FlushAsync(ct);
        }
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

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var ingestTimeout = _settings.IngestTimeoutSeconds > 0 ? _settings.IngestTimeoutSeconds : 300;
        cts.CancelAfter(TimeSpan.FromSeconds(ingestTimeout));

        var response = await _httpClient.PostAsync("/api/transcripts/ingest", content, cts.Token);
        var responseBody = await response.Content.ReadAsStringAsync(cts.Token);

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
        int? materialId = null,
        CancellationToken ct = default)
    {
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(courseId.ToString()), "course_id");

        if (lessonId.HasValue)
        {
            form.Add(new StringContent(lessonId.Value.ToString()), "lesson_id");
        }

        if (materialId.HasValue)
        {
            form.Add(new StringContent(materialId.Value.ToString()), "material_id");
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

        _logger.LogInformation("Uploading and indexing document {FileName} for Course {CourseId}, MaterialId {MaterialId} in MentorChat...", 
            fileName, courseId, materialId);

        // Tăng timeout ingest ở .NET cho upload PDF hoặc tệp tài liệu lớn
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var ingestTimeout = _settings.IngestTimeoutSeconds > 0 ? _settings.IngestTimeoutSeconds : 300;
        cts.CancelAfter(TimeSpan.FromSeconds(ingestTimeout));

        var response = await _httpClient.PostAsync("/api/documents/upload", form, cts.Token);
        var responseBody = await response.Content.ReadAsStringAsync(cts.Token);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("MentorChat document ingestion failed with {StatusCode}: {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"MentorChat document upload failed ({response.StatusCode}): {responseBody}");
        }

        return JsonSerializer.Deserialize<MentorIngestResponseDto>(responseBody, JsonOptions);
    }

    public async Task<bool> DeleteKnowledgeAsync(
        int courseId, 
        int? lessonId = null, 
        int? materialId = null, 
        string? sourceType = null, 
        CancellationToken ct = default)
    {
        var sb = new StringBuilder($"/api/knowledge?course_id={courseId}");
        if (lessonId.HasValue)
        {
            sb.Append($"&lesson_id={lessonId.Value}");
        }
        if (materialId.HasValue)
        {
            sb.Append($"&material_id={materialId.Value}");
        }
        if (!string.IsNullOrWhiteSpace(sourceType))
        {
            sb.Append($"&source_type={Uri.EscapeDataString(sourceType)}");
        }

        var requestUri = sb.ToString();
        _logger.LogInformation("Sending delete knowledge request to MentorChat: {RequestUri}", requestUri);

        try
        {
            var response = await _httpClient.DeleteAsync(requestUri, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("MentorChat delete knowledge returned non-success code {StatusCode}: {Body}", response.StatusCode, responseBody);
                return false;
            }

            _logger.LogInformation("Successfully deleted knowledge points in MentorChat for Course {CourseId}.", courseId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to call delete knowledge endpoint in MentorChat for Course {CourseId} (service might be down)", courseId);
            return false;
        }
    }
}
