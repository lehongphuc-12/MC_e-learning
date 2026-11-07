using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

/// <summary>Processes durable R2 cleanup jobs independently of course deletion requests.</summary>
public sealed class R2ObjectDeletionWorker : BackgroundService
{
    private const int BatchSize = 50;
    private const int MaxAttempts = 10;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<R2ObjectDeletionWorker> _logger;

    public R2ObjectDeletionWorker(IServiceScopeFactory scopeFactory, ILogger<R2ObjectDeletionWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process R2 object deletion jobs.");
            }
        }
    }

    private async Task ProcessBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmartMcDbContext>();
        var r2 = scope.ServiceProvider.GetRequiredService<IR2StorageService>();
        var now = DateTime.UtcNow;

        // Recover jobs whose worker crashed after claiming them. Deleting an already-missing key is idempotent.
        await db.R2ObjectDeletionJobs
            .Where(job => job.Status == "PROCESSING" && job.ProcessingAt < now.AddMinutes(-10))
            .ExecuteUpdateAsync(update => update
                .SetProperty(job => job.Status, "PENDING")
                .SetProperty(job => job.ProcessingAt, (DateTime?)null)
                .SetProperty(job => job.NextAttemptAt, now), cancellationToken);

        List<R2ObjectDeletionJob> jobs;
        await using (var transaction = await db.Database.BeginTransactionAsync(cancellationToken))
        {
            // SKIP LOCKED allows multiple application instances to safely claim separate jobs.
            jobs = await db.R2ObjectDeletionJobs
                .FromSqlRaw("SELECT * FROM r2_object_deletion_jobs WHERE \"Status\" = 'PENDING' AND \"NextAttemptAt\" <= NOW() ORDER BY \"CreatedAt\" LIMIT {0} FOR UPDATE SKIP LOCKED", BatchSize)
                .ToListAsync(cancellationToken);

            foreach (var job in jobs)
            {
                job.Status = "PROCESSING";
                job.ProcessingAt = now;
            }

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        foreach (var job in jobs)
        {
            try
            {
                await r2.DeleteAsync(job.ObjectKey);
                job.Status = "COMPLETED";
                job.CompletedAt = DateTime.UtcNow;
                job.LastError = null;
            }
            catch (Exception ex)
            {
                job.Attempts++;
                job.Status = job.Attempts >= MaxAttempts ? "FAILED" : "PENDING";
                job.NextAttemptAt = DateTime.UtcNow.AddMinutes(Math.Min(60, Math.Pow(2, job.Attempts - 1)));
                job.LastError = ex.Message.Length <= 2000 ? ex.Message : ex.Message[..2000];
                _logger.LogWarning(ex, "R2 deletion failed for key {ObjectKey}; attempt {Attempt}/{MaxAttempts}.", job.ObjectKey, job.Attempts, MaxAttempts);
            }

            job.ProcessingAt = null;
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
