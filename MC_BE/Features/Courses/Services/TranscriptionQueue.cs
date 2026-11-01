using System.Threading.Channels;
using MC_BE.Features.Courses.Services.Interfaces;

namespace MC_BE.Features.Courses.Services;

public class TranscriptionQueue : ITranscriptionQueue
{
    private readonly Channel<TranscriptionJob> _channel;

    public TranscriptionQueue()
    {
        // Unbounded or large bounded channel to prevent backpressure
        var options = new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _channel = Channel.CreateBounded<TranscriptionJob>(options);
    }

    public async ValueTask EnqueueAsync(TranscriptionJob job)
    {
        ArgumentNullException.ThrowIfNull(job);
        await _channel.Writer.WriteAsync(job);
    }

    public async ValueTask<TranscriptionJob> DequeueAsync(CancellationToken cancellationToken)
    {
        return await _channel.Reader.ReadAsync(cancellationToken);
    }
}
