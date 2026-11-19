namespace MC_BE.Shared.Settings;

public class MentorChatSettings
{
    public string BaseUrl { get; set; } = "http://localhost:8000";
    public int TimeoutSeconds { get; set; } = 120;
    public int IngestTimeoutSeconds { get; set; } = 300;
    public string ApiKey { get; set; } = "mc-internal-secret-key-2026";
}
