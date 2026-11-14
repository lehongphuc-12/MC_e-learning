using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

/// <summary>Removes abandoned staging objects after their signed upload URLs expire.</summary>
public sealed class VideoUploadSessionCleanupWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<VideoUploadSessionCleanupWorker> _logger;

    public VideoUploadSessionCleanupWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<VideoUploadSessionCleanupWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(30));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupExpiredSessionsAsync(stoppingToken);
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to clean up expired video upload sessions.");
            }
        }
    }

    private async Task CleanupExpiredSessionsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmartMcDbContext>();
        var r2 = scope.ServiceProvider.GetRequiredService<IR2StorageService>();
        var expired = await db.VideoUploadSessions
            .Where(session => session.Status == "PENDING" && session.ExpiresAt <= DateTime.UtcNow)
            .OrderBy(session => session.ExpiresAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var session in expired)
        {
            try
            {
                await r2.DeleteAsync(session.ObjectKey);
                session.Status = "EXPIRED";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not remove abandoned R2 object for upload session {SessionId}.", session.SessionId);
            }
        }

        var expiredSyllabus = await db.CourseSyllabusUploadSessions
            .Where(session => session.Status == "PENDING" && session.ExpiresAt <= DateTime.UtcNow)
            .OrderBy(session => session.ExpiresAt)
            .Take(100)
            .ToListAsync(cancellationToken);
        foreach (var session in expiredSyllabus)
        {
            try
            {
                await r2.DeleteAsync(session.ObjectKey);
                session.Status = "EXPIRED";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not remove abandoned R2 syllabus object for upload session {SessionId}.", session.SessionId);
            }
        }

        if (expired.Any(session => session.Status == "EXPIRED") || expiredSyllabus.Any(session => session.Status == "EXPIRED"))
            await db.SaveChangesAsync(cancellationToken);
    }
}
