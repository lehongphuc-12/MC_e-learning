
using System.Text.Json;

namespace MC_BE.Features.VoiceAssessment.Services;

public static class LLMJsonParser
{
    public static T Parse<T>(string response)
    {
        if (string.IsNullOrWhiteSpace(response))
        {
            throw new JsonException(
                "LLM trả về nội dung rỗng.");
        }

        var json = response.Trim();

        // Loại bỏ Markdown code fence nếu có.
        if (json.StartsWith("```"))
        {
            var firstNewLine = json.IndexOf('\n');

            if (firstNewLine >= 0)
                json = json[(firstNewLine + 1)..];

            var lastFence = json.LastIndexOf("```");

            if (lastFence >= 0)
                json = json[..lastFence];

            json = json.Trim();
        }

        return JsonSerializer.Deserialize<T>(
                   json,
                   new JsonSerializerOptions
                   {
                       PropertyNameCaseInsensitive = true
                   })
               ?? throw new JsonException(
                   "Không thể chuyển đổi phản hồi LLM.");
    }
}
