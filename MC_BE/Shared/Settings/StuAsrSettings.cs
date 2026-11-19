namespace MC_BE.Shared.Settings;

public sealed class StuAsrSettings
{
    public string BaseUrl { get; set; } = "";
    public string Endpoint { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "MAI-Transcribe-1.5";
    public int TimeoutSeconds { get; set; } = 120;
}