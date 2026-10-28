
using System.Diagnostics;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Quizzes.Sync;

public sealed class QuizAutoSyncWorker(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<QuizAutoSyncWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = configuration.GetValue("QuizAutoSync:Enabled", false);
        if (!enabled)
        {
            logger.LogInformation("Quiz Auto Sync is disabled. Set QuizAutoSync:Enabled=true to enable.");
            return;
        }

        var interval = Math.Clamp(configuration.GetValue("QuizAutoSync:IntervalSeconds", 30), 10, 3600);
        var timeout = Math.Clamp(configuration.GetValue("QuizAutoSync:QuizTimeoutSeconds", 120), 30, 600);

        logger.LogInformation("Quiz Auto Sync started. Interval={Interval}s, QuizTimeout={Timeout}s", interval, timeout);

        try
        {
            await RunCycleAsync(timeout, stoppingToken);

            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(interval));
            while (await timer.WaitForNextTickAsync(stoppingToken))
                await RunCycleAsync(timeout, stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            logger.LogInformation("Quiz Auto Sync stopped.");
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "Quiz Auto Sync worker stopped unexpectedly.");
            throw;
        }
    }

    private async Task RunCycleAsync(int timeoutSeconds, CancellationToken ct)
    {
        List<(int QuizId, int InstructorId)> quizzes;

        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SmartMcDbContext>();

            var rows = await db.Quizzes.AsNoTracking()
                .Select(q => new { q.QuizId, q.CreatedById })
                .ToListAsync(ct);

            quizzes = rows.Select(q => (q.QuizId, q.CreatedById)).ToList();

            logger.LogInformation("Auto Sync cycle started. Total quizzes={Count}", quizzes.Count);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError(ex, "Quiz Auto Sync could not load quiz list.");
            return;
        }

        foreach (var (quizId, instructorId) in quizzes)
        {
            ct.ThrowIfCancellationRequested();

            using var quizCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            quizCts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));
            var watch = Stopwatch.StartNew();

            try
            {
                using var scope = scopeFactory.CreateScope();
                var sync = scope.ServiceProvider.GetRequiredService<QuizFullSyncService>();

                logger.LogInformation("Quiz {QuizId}: START PlanAsync", quizId);

                var plan = await sync.PlanAsync(quizId, instructorId, quizCts.Token);

                logger.LogInformation(
                    "Quiz {QuizId}: END PlanAsync. Status={Status}, Changes={Changes}, Conflicts={Conflicts}, Elapsed={Elapsed}ms",
                    quizId, plan.Status, plan.Changes.Count, plan.Conflicts.Count, watch.ElapsedMilliseconds);

                if (plan.Status == "BASELINE_REQUIRED")
                {
                    logger.LogInformation("Quiz {QuizId}: waiting for Instructor baseline confirmation.", quizId);
                    continue;
                }

                if (plan.Status is "READY" or "CONFLICT" or "RECOVERY_PENDING")
                {
                    logger.LogInformation("Quiz {QuizId}: START ExecuteAsync", quizId);

                    plan = await sync.ExecuteAsync(quizId, instructorId, quizCts.Token);

                    logger.LogInformation(
                        "Quiz {QuizId}: END ExecuteAsync. Status={Status}, Elapsed={Elapsed}ms",
                        quizId, plan.Status, watch.ElapsedMilliseconds);
                }

                if (plan.Status is "IN_SYNC" or "SYNCED")
                {
                    logger.LogInformation(
                        "Quiz {QuizId}: FINISHED {Status}. Changes={Changes}, Elapsed={Elapsed}ms",
                        quizId, plan.Status, plan.Changes.Count, watch.ElapsedMilliseconds);
                }
                else
                {
                    logger.LogWarning(
                        "Quiz {QuizId}: FINISHED {Status}. Conflicts={Conflicts}, Problems={Problems}, Elapsed={Elapsed}ms",
                        quizId, plan.Status, plan.Conflicts.Count,
                        string.Join("; ", plan.Problems), watch.ElapsedMilliseconds);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (OperationCanceledException) when (quizCts.IsCancellationRequested)
            {
                logger.LogError(
                    "Quiz {QuizId}: TIMEOUT after {Timeout}s. Last elapsed={Elapsed}ms",
                    quizId, timeoutSeconds, watch.ElapsedMilliseconds);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Quiz {QuizId}: FAILED after {Elapsed}ms", quizId, watch.ElapsedMilliseconds);
            }
            finally
            {
                watch.Stop();
            }
        }

        logger.LogInformation("Auto Sync cycle finished.");
    }
}
