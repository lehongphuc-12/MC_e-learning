namespace MC_BE.Shared.Settings;

public class GroqSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "whisper-large-v3";
}
