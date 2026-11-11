
namespace MC_BE.Shared.Settings;

public class VoiceAssessmentAISettings
{
    public string BaseUrl { get; set; } =
        "https://nozero23061311-mseek-v4b-pronunciation-api.hf.space";

    public string ApiKey { get; set; } = string.Empty;

    public int TimeoutSeconds { get; set; } = 180;

    public int MaxUploadBytes { get; set; } =
        25 * 1024 * 1024;
}
