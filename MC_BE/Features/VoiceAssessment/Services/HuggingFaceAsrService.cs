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

// Uses the same configured VoiceAssessmentAI named client and API key as C01.
public sealed class HuggingFaceAsrService : IAsrService
{
    private readonly IHttpClientFactory _clients;
    private readonly VoiceAssessmentAISettings _settings;

    public HuggingFaceAsrService(IHttpClientFactory clients, IOptions<VoiceAssessmentAISettings> settings)
    {
        _clients = clients;
        _settings = settings.Value;
    }

    public async Task<string?> TranscribeAsync(byte[] audio, string extension, CancellationToken ct)
    {
        if (audio == null || audio.Length == 0) throw new ArgumentException("Audio rỗng.", nameof(audio));
        extension = extension?.Trim().ToLowerInvariant() ?? "";
        if (extension is not (".wav" or ".flac"))
            throw new ArgumentException("C03 chỉ hỗ trợ WAV/FLAC.", nameof(extension));

        using var form = new MultipartFormDataContent();
        using var content = new ByteArrayContent(audio);
        content.Headers.ContentType = new MediaTypeHeaderValue(extension == ".wav" ? "audio/wav" : "audio/flac");
        form.Add(content, "file", "practice" + extension);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/c03/transcribe") { Content = form };
        if (!string.IsNullOrWhiteSpace(_settings.ApiKey))
            request.Headers.Add("X-API-Key", _settings.ApiKey);

        using var response = await _clients.CreateClient("VoiceAssessmentAI")
            .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"C03 ASR HTTP {(int)response.StatusCode}.");

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var json = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!json.RootElement.TryGetProperty("transcript", out var value) || value.ValueKind != JsonValueKind.String)
            throw new InvalidOperationException("C03 không trả về transcript hợp lệ.");
        return string.IsNullOrWhiteSpace(value.GetString()) ? null : value.GetString()!.Trim();
    }
}
