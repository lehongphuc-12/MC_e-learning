namespace MC_BE.Shared.Settings;

public class MentorChatSettings
{
    public string BaseUrl { get; set; } = "http://localhost:8000";
    public int TimeoutSeconds { get; set; } = 60;
}
