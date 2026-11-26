
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Features.VoiceAssessment.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.Extensions.Options;

namespace MC_BE.Features.VoiceAssessment.Services;

public sealed class MaiTranscribeService : IAsrService
{
    private readonly HttpClient _httpClient;
    private readonly StuAsrSettings _settings;

    public MaiTranscribeService(
        HttpClient httpClient,
        IOptions<StuAsrSettings> options)
    {
        _httpClient = httpClient;
        _settings = options.Value;

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình STU_ASR:ApiKey trong appsettings.");
        }

        if (string.IsNullOrWhiteSpace(_settings.Model))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình STU_ASR:Model.");
        }

        if (string.IsNullOrWhiteSpace(_settings.Endpoint))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình STU_ASR:Endpoint.");
        }
    }

    public async Task<string?> TranscribeAsync(
        byte[] audio,
        string extension,
        CancellationToken ct)
    {
        if (audio == null || audio.Length == 0)
        {
            throw new ArgumentException(
                "File âm thanh không được rỗng.",
                nameof(audio));
        }

        if (string.IsNullOrWhiteSpace(extension))
        {
            throw new ArgumentException(
                "Định dạng âm thanh không hợp lệ.",
                nameof(extension));
        }

        extension = extension.Trim().ToLowerInvariant();

        if (!extension.StartsWith("."))
        {
            extension = "." + extension;
        }

        var mimeType = extension switch
        {
            ".wav" => "audio/wav",
            ".mp3" => "audio/mpeg",
            ".flac" => "audio/flac",
            ".m4a" => "audio/mp4",
            ".webm" => "audio/webm",
            _ => "application/octet-stream"
        };

        using var form = new MultipartFormDataContent();

        using var fileContent = new ByteArrayContent(audio);

        fileContent.Headers.ContentType =
            new MediaTypeHeaderValue(mimeType);

        form.Add(
            fileContent,
            "file",
            $"practice{extension}");

        form.Add(
            new StringContent(_settings.Model),
            "model");

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            _settings.Endpoint.TrimStart('/'));

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                _settings.ApiKey);

        request.Content = form;

        using var response = await _httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            ct);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"ASR thất bại. HTTP {(int)response.StatusCode} " +
                $"({response.ReasonPhrase}).");
        }

        await using var responseStream =
            await response.Content.ReadAsStreamAsync(ct);

        using var document = await JsonDocument.ParseAsync(
            responseStream,
            cancellationToken: ct);

        if (!document.RootElement.TryGetProperty(
                "text",
                out var textElement) ||
            textElement.ValueKind != JsonValueKind.String)
        {
            throw new InvalidOperationException(
                "ASR không trả về trường text hợp lệ.");
        }

        var transcript = textElement.GetString()?.Trim();

        if (string.IsNullOrWhiteSpace(transcript))
        {
            return null;
        }

        return transcript;
    }
}
