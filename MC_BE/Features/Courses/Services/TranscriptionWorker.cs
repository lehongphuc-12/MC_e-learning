using System.Text;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Courses.Services;

public class TranscriptionWorker : BackgroundService
{
    private readonly ITranscriptionQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TranscriptionWorker> _logger;

    public TranscriptionWorker(
        ITranscriptionQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<TranscriptionWorker> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("TranscriptionWorker started, waiting for video transcription jobs...");

        while (!stoppingToken.IsCancellationRequested)
        {
            TranscriptionJob? job = null;
            try
            {
                job = await _queue.DequeueAsync(stoppingToken);
                await ProcessJobAsync(job, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in TranscriptionWorker loop for lesson {LessonId}", job?.LessonId);
            }
        }

        _logger.LogInformation("TranscriptionWorker is stopping.");
    }

    private async Task ProcessJobAsync(TranscriptionJob job, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Processing transcription job for Lesson {LessonId}...", job.LessonId);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmartMcDbContext>();
        var r2 = scope.ServiceProvider.GetRequiredService<IR2StorageService>();
        var audioExtractor = scope.ServiceProvider.GetRequiredService<IAudioExtractorService>();
        var groqService = scope.ServiceProvider.GetRequiredService<IGroqWhisperService>();

        // Set status to PROCESSING
        var lesson = await db.Lessons.FirstOrDefaultAsync(l => l.LessonId == job.LessonId, cancellationToken);
        if (lesson == null)
        {
            _logger.LogWarning("Lesson {LessonId} not found, skipping transcription job.", job.LessonId);
            CleanupFile(job.VideoTempFilePath);
            return;
        }

        lesson.TranscriptStatus = TranscriptStatus.PROCESSING;
        await db.SaveChangesAsync(cancellationToken);

        string? mp3TempPath = null;
        try
        {
            // 1. Extract audio from video to temp MP3 (64kbps, mono)
            mp3TempPath = Path.Combine(Path.GetTempPath(), $"mseek_audio_{job.LessonId}_{Guid.NewGuid():N}.mp3");
            await audioExtractor.ExtractAudioToMp3Async(job.VideoTempFilePath, mp3TempPath, cancellationToken);

            // 2. Send MP3 stream to Groq Whisper Cloud API
            await using var mp3Stream = File.OpenRead(mp3TempPath);
            var result = await groqService.TranscribeAudioAsync(
                mp3Stream, 
                Path.GetFileName(mp3TempPath), 
                "vi", 
                cancellationToken);

            _logger.LogInformation("Transcription successful for Lesson {LessonId}: {Length} chars, duration {Duration}s", 
                job.LessonId, result.Text.Length, result.Duration);

            // 3. Upload WebVTT subtitle file to Cloudflare R2
            string? subtitleUrl = null;
            if (!string.IsNullOrWhiteSpace(result.WebVtt))
            {
                using var vttStream = new MemoryStream(Encoding.UTF8.GetBytes(result.WebVtt));
                subtitleUrl = await r2.UploadAsync(
                    vttStream, 
                    $"subtitle_{job.LessonId}.vtt", 
                    "text/vtt", 
                    $"lessons/{job.LessonId}");
            }

            // 4. Update Lesson record in Database
            lesson.Transcript = result.Text;
            lesson.SubtitleUrl = subtitleUrl;
            lesson.TranscriptStatus = TranscriptStatus.COMPLETED;
            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Lesson {LessonId} transcription completed and saved successfully.", job.LessonId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to transcribe video for Lesson {LessonId}", job.LessonId);
            try
            {
                lesson.TranscriptStatus = TranscriptStatus.FAILED;
                await db.SaveChangesAsync(CancellationToken.None);
            }
            catch (Exception dbEx)
            {
                _logger.LogError(dbEx, "Failed to update Lesson {LessonId} status to FAILED", job.LessonId);
            }
        }
        finally
        {
            CleanupFile(job.VideoTempFilePath);
            if (!string.IsNullOrEmpty(mp3TempPath))
            {
                CleanupFile(mp3TempPath);
            }
        }
    }

    private void CleanupFile(string? path)
    {
        if (string.IsNullOrEmpty(path)) return;
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not delete temporary file: {Path}", path);
        }
    }
}
