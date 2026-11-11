
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using MC_BE.Features.VoiceAssessment.Providers.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.Extensions.Options;

namespace MC_BE.Features.VoiceAssessment.Providers;

public class OpenAIProvider : ILLMProvider
{
    private readonly HttpClient _httpClient;
    private readonly OpenAISettings _settings;
    private readonly ILogger<OpenAIProvider> _logger;

    public OpenAIProvider(
        HttpClient httpClient,
        IOptions<OpenAISettings> options,
        ILogger<OpenAIProvider> logger)
    {
        _httpClient = httpClient;
        _settings = options.Value;
        _logger = logger;

        if (!Uri.TryCreate(
                _settings.BaseUrl,
                UriKind.Absolute,
                out var baseUri) ||
            (baseUri.Scheme != Uri.UriSchemeHttps &&
             baseUri.Scheme != Uri.UriSchemeHttp))
        {
            throw new InvalidOperationException(
                "OpenAI BaseUrl không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình OpenAI API Key.");
        }

        if (string.IsNullOrWhiteSpace(_settings.Model))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình OpenAI Model.");
        }

        if (_settings.TimeoutSeconds <= 0)
        {
            throw new InvalidOperationException(
                "OpenAI TimeoutSeconds phải lớn hơn 0.");
        }

        _httpClient.BaseAddress = new Uri(
            _settings.BaseUrl.TrimEnd('/') + "/");

        _httpClient.Timeout = TimeSpan.FromSeconds(
            _settings.TimeoutSeconds);
    }

    public async Task<string> GenerateAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(systemPrompt))
            throw new ArgumentException(
                "System Prompt không được để trống.",
                nameof(systemPrompt));

        if (string.IsNullOrWhiteSpace(userPrompt))
            throw new ArgumentException(
                "User Prompt không được để trống.",
                nameof(userPrompt));

        var payload = new
        {
            model = _settings.Model,
            instructions = systemPrompt,
            input = userPrompt
        };

        var json = JsonSerializer.Serialize(payload);

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "responses");

        request.Content = new StringContent(
            json,
            Encoding.UTF8,
            "application/json");

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                _settings.ApiKey);

        _logger.LogInformation(
            "Sending request to AI Portal. Model: {Model}",
            _settings.Model);

        try
        {
            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            var responseBody =
                await response.Content.ReadAsStringAsync(
                    cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "AI Portal returned HTTP {StatusCode}. Response: {Body}",
                    (int)response.StatusCode,
                    responseBody.Length > 2000
                        ? responseBody[..2000]
                        : responseBody);

                throw new HttpRequestException(
                    $"AI Portal trả về lỗi HTTP {(int)response.StatusCode}.");
            }

            var output = ExtractOutputText(responseBody);

            _logger.LogInformation(
                "AI Portal response received successfully. Model: {Model}",
                _settings.Model);

            return output;
        }
        catch (OperationCanceledException)
            when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError("AI Portal request timed out.");

            throw new TimeoutException(
                "Dịch vụ AI phản hồi quá thời gian cho phép.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(
                ex,
                "Cannot connect to AI Portal.");

            throw new HttpRequestException(
                "Không thể kết nối dịch vụ AI.",
                ex);
        }
    }

    private static string ExtractOutputText(string responseBody)
    {
        try
        {
            using var document = JsonDocument.Parse(responseBody);
            var root = document.RootElement;

            if (root.TryGetProperty(
                    "output_text",
                    out var outputText) &&
                outputText.ValueKind == JsonValueKind.String)
            {
                var value = outputText.GetString();

                if (!string.IsNullOrWhiteSpace(value))
                    return value.Trim();
            }

            if (root.TryGetProperty(
                    "output",
                    out var output) &&
                output.ValueKind == JsonValueKind.Array)
            {
                var builder = new StringBuilder();

                foreach (var item in output.EnumerateArray())
                {
                    if (!item.TryGetProperty(
                            "content",
                            out var content) ||
                        content.ValueKind != JsonValueKind.Array)
                        continue;

                    foreach (var block in content.EnumerateArray())
                    {
                        if (block.TryGetProperty(
                                "type",
                                out var type) &&
                            type.ValueKind == JsonValueKind.String &&
                            type.GetString() != "output_text")
                            continue;

                        if (!block.TryGetProperty(
                                "text",
                                out var textElement) ||
                            textElement.ValueKind != JsonValueKind.String)
                            continue;

                        var text = textElement.GetString();

                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            if (builder.Length > 0)
                                builder.AppendLine();

                            builder.Append(text);
                        }
                    }
                }

                if (builder.Length > 0)
                    return builder.ToString().Trim();
            }

            throw new JsonException(
                "Responses API không chứa nội dung văn bản.");
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException(
                "Không thể đọc cấu trúc phản hồi từ AI Portal.",
                ex);
        }
    }
}
