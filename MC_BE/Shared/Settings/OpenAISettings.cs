namespace MC_BE.Shared.Settings;

public class OpenAISettings
{
    public string BaseUrl { get; set; } =
        "https://aiportalapi.stu-platform.live/use";

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "GPT-6-Luna";

    public int TimeoutSeconds { get; set; } = 90;
}