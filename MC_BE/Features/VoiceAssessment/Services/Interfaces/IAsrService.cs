namespace MC_BE.Features.VoiceAssessment.Services.Interfaces;

public interface IAsrService
{
    Task<string?> TranscribeAsync(
        byte[] audio,
        string extension,
        CancellationToken ct);
}