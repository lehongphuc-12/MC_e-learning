namespace MC_BE.Shared.Services.Interfaces;

public class TranscriptionResult
{
    public string Text { get; set; } = string.Empty;
    public string WebVtt { get; set; } = string.Empty;
    public double Duration { get; set; }
}

public interface IGroqWhisperService
{
    Task<TranscriptionResult> TranscribeAudioAsync(
        Stream audioStream, 
        string fileName, 
        string language = "vi", 
        CancellationToken cancellationToken = default);
}
