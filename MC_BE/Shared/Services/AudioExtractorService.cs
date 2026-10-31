using FFMpegCore;
using FFMpegCore.Enums;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace MC_BE.Shared.Services;

public class AudioExtractorService : IAudioExtractorService
{
    private readonly ILogger<AudioExtractorService> _logger;
    private static bool _ffmpegConfigured = false;
    private static readonly object _lock = new();

    public AudioExtractorService(ILogger<AudioExtractorService> logger)
    {
        _logger = logger;
        EnsureFFmpegConfigured();
    }

    private void EnsureFFmpegConfigured()
    {
        if (_ffmpegConfigured) return;

        lock (_lock)
        {
            if (_ffmpegConfigured) return;

            try
            {
                // Check if ffmpeg is in current PATH or winget directory
                var wingetFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Microsoft", "WinGet", "Packages");

                if (Directory.Exists(wingetFolder))
                {
                    var ffmpegExe = Directory.GetFiles(wingetFolder, "ffmpeg.exe", SearchOption.AllDirectories)
                        .FirstOrDefault();

                    if (!string.IsNullOrEmpty(ffmpegExe))
                    {
                        var binDir = Path.GetDirectoryName(ffmpegExe)!;
                        GlobalFFOptions.Configure(new FFOptions { BinaryFolder = binDir });
                        _logger.LogInformation("FFmpeg binary folder configured: {Folder}", binDir);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not auto-discover WinGet FFmpeg directory, relying on system PATH.");
            }

            _ffmpegConfigured = true;
        }
    }

    public async Task ExtractAudioToMp3Async(
        string videoFilePath, 
        string outputMp3Path, 
        CancellationToken cancellationToken = default)
    {
        if (!File.Exists(videoFilePath))
        {
            throw new FileNotFoundException($"Video file not found at: {videoFilePath}");
        }

        _logger.LogInformation("Extracting audio from {VideoPath} to {Mp3Path}...", videoFilePath, outputMp3Path);

        // Ensure target directory exists
        var targetDir = Path.GetDirectoryName(outputMp3Path);
        if (!string.IsNullOrEmpty(targetDir) && !Directory.Exists(targetDir))
        {
            Directory.CreateDirectory(targetDir);
        }

        // Convert to 64kbps mono MP3 (optimal for speech recognition and minimal size)
        await FFMpegArguments
            .FromFileInput(videoFilePath)
            .OutputToFile(outputMp3Path, true, options => options
                .WithAudioCodec(AudioCodec.LibMp3Lame)
                .WithAudioBitrate(64)
                .WithCustomArgument("-ac 1")) // Mono
            .CancellableThrough(cancellationToken)
            .ProcessAsynchronously();

        _logger.LogInformation("Audio extraction completed: {Mp3Path} ({Size} KB)", 
            outputMp3Path, new FileInfo(outputMp3Path).Length / 1024);
    }
}
