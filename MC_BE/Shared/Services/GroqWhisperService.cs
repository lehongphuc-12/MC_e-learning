using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MC_BE.Shared.Services;

public class GroqWhisperService : IGroqWhisperService
{
    private readonly HttpClient _httpClient;
    private readonly GroqSettings _settings;
    private readonly ILogger<GroqWhisperService> _logger;

    public GroqWhisperService(
        HttpClient httpClient,
        IOptions<GroqSettings> options,
        ILogger<GroqWhisperService> logger)
    {
        _httpClient = httpClient;
        _settings = options.Value;
        _logger = logger;
    }

    public async Task<TranscriptionResult> TranscribeAudioAsync(
        Stream audioStream, 
        string fileName, 
        string language = "vi", 
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new InvalidOperationException("Groq:ApiKey is not configured. Please add it to appsettings.json or User Secrets.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/audio/transcriptions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey.Trim());

        using var content = new MultipartFormDataContent();

        // 1. Audio stream content
        var streamContent = new StreamContent(audioStream);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue("audio/mpeg");
        content.Add(streamContent, "file", fileName);

        // 2. Form fields
        var model = string.IsNullOrWhiteSpace(_settings.Model) ? "whisper-large-v3" : _settings.Model;
        content.Add(new StringContent(model), "model");
        content.Add(new StringContent("verbose_json"), "response_format");

        if (!string.IsNullOrWhiteSpace(language))
        {
            content.Add(new StringContent(language), "language");
        }

        request.Content = content;

        _logger.LogInformation("Sending audio transcription request to Groq (model: {Model}, file: {FileName})...", model, fileName);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Groq transcription API failed with status {StatusCode}: {ErrorBody}", response.StatusCode, responseBody);
            throw new HttpRequestException($"Groq transcription failed ({response.StatusCode}): {responseBody}");
        }

        using var jsonDoc = JsonDocument.Parse(responseBody);
        var root = jsonDoc.RootElement;

        var fullText = root.TryGetProperty("text", out var textProp) ? textProp.GetString() ?? string.Empty : string.Empty;
        var duration = root.TryGetProperty("duration", out var durProp) ? durProp.GetDouble() : 0.0;

        // Build WebVTT subtitles
        var webVttBuilder = new StringBuilder();
        webVttBuilder.AppendLine("WEBVTT - Transcribed by MSEEK Whisper AI");
        webVttBuilder.AppendLine();

        if (root.TryGetProperty("segments", out var segmentsProp) && segmentsProp.ValueKind == JsonValueKind.Array)
        {
            int index = 1;
            foreach (var segment in segmentsProp.EnumerateArray())
            {
                var start = segment.TryGetProperty("start", out var startProp) ? startProp.GetDouble() : 0.0;
                var end = segment.TryGetProperty("end", out var endProp) ? endProp.GetDouble() : 0.0;
                var segmentText = segment.TryGetProperty("text", out var sTextProp) ? sTextProp.GetString()?.Trim() ?? string.Empty : string.Empty;

                if (string.IsNullOrWhiteSpace(segmentText))
                    continue;

                webVttBuilder.AppendLine(index.ToString(CultureInfo.InvariantCulture));
                webVttBuilder.AppendLine($"{FormatVttTimestamp(start)} --> {FormatVttTimestamp(end)}");
                webVttBuilder.AppendLine(segmentText);
                webVttBuilder.AppendLine();
                index++;
            }
        }

        return new TranscriptionResult
        {
            Text = fullText.Trim(),
            WebVtt = webVttBuilder.ToString(),
            Duration = duration
        };
    }

    private static string FormatVttTimestamp(double seconds)
    {
        var ts = TimeSpan.FromSeconds(Math.Max(0, seconds));
        return $"{(int)ts.TotalHours:00}:{ts.Minutes:00}:{ts.Seconds:00}.{ts.Milliseconds:000}";
    }
}
