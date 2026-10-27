namespace MC_BE.Features.Courses.Services.Interfaces;

public class TranscriptionJob
{
    public int LessonId { get; set; }
    public string VideoTempFilePath { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
}

public interface ITranscriptionQueue
{
    ValueTask EnqueueAsync(TranscriptionJob job);
    ValueTask<TranscriptionJob> DequeueAsync(CancellationToken cancellationToken);
}
