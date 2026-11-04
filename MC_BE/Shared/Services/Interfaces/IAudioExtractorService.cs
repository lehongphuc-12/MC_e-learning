namespace MC_BE.Shared.Services.Interfaces;

public interface IAudioExtractorService
{
    /// <summary>
    /// Extracts audio from a video file into a compressed MP3 file (64kbps, mono) suitable for STT processing.
    /// </summary>
    /// <param name="videoFilePath">Path to the source video file</param>
    /// <param name="outputMp3Path">Path where the output MP3 will be saved</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task ExtractAudioToMp3Async(string videoFilePath, string outputMp3Path, CancellationToken cancellationToken = default);
}
