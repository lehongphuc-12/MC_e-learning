using MC_BE.Core.Enums;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Quizzes.Sync;

/// <summary>
/// Applies quiz availability windows independently from the optional Google Sheets sync worker.
/// ARCHIVED + due AvailableFrom => ACTIVE.
/// ACTIVE + due AvailableUntil => INACTIVE.
/// Manual INACTIVE and DRAFT quizzes are never re-published.
/// All timestamps are stored and compared in UTC.
/// </summary>
public sealed class QuizAvailabilityWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<QuizAvailabilityWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Quiz availability scheduler started. Interval={Interval}s.", Interval.TotalSeconds);
        await ApplyTransitionsAsync(stoppingToken);

        using var timer = new PeriodicTimer(Interval);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
                await ApplyTransitionsAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation("Quiz availability scheduler stopped.");
        }
    }

    private async Task ApplyTransitionsAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SmartMcDbContext>();
            var now = DateTime.UtcNow;

            var scheduled = await db.Quizzes
                .Where(q =>
                    (q.Status == QuizStatus.ARCHIVED && q.AvailableFrom.HasValue && q.AvailableFrom.Value <= now) ||
                    (q.Status == QuizStatus.ACTIVE && q.AvailableUntil.HasValue && q.AvailableUntil.Value <= now))
                .ToListAsync(cancellationToken);

            var changed = 0;
            foreach (var quiz in scheduled)
            {
                if (quiz.Status == QuizStatus.ARCHIVED &&
                    quiz.AvailableFrom.HasValue &&
                    quiz.AvailableFrom.Value <= now)
                {
                    quiz.Status = quiz.AvailableUntil.HasValue && quiz.AvailableUntil.Value <= now
                        ? QuizStatus.INACTIVE
                        : QuizStatus.ACTIVE;
                    changed++;
                }
                else if (quiz.Status == QuizStatus.ACTIVE &&
                         quiz.AvailableUntil.HasValue &&
                         quiz.AvailableUntil.Value <= now)
                {
                    quiz.Status = QuizStatus.INACTIVE;
                    changed++;
                }
            }

            if (changed > 0)
            {
                await db.SaveChangesAsync(cancellationToken);
                logger.LogInformation("Quiz availability scheduler updated {Count} quiz status(es).", changed);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Quiz availability scheduler cycle failed.");
        }
    }
}
