
using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Notifications;

public class NotificationReminderWorker(
    IServiceScopeFactory scopes,
    ILogger<NotificationReminderWorker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));

        do
        {
            try
            {
                await CheckAsync(stoppingToken);
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "Notification reminder job failed"
                );
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CheckAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();

        var db = scope.ServiceProvider
            .GetRequiredService<SmartMcDbContext>();

        var today = DateTime.UtcNow.ToString("yyyyMMdd");

        var reminders = new List<Notification>();

        // 1. Nhắc học sinh làm Practice More
        var pending = await (
            from r in db.RemedialAssignmentRecipients.AsNoTracking()
            join a in db.RemedialAssignments.AsNoTracking()
                on r.RemedialAssignmentId equals a.RemedialAssignmentId
            where r.CompletedAt == null
                && r.Status != "COMPLETED"
                && a.IsActive
            select new
            {
                r.RecipientId,
                r.StudentId,
                a.Title
            }
        ).ToListAsync(ct);

        foreach (var r in pending)
        {
            reminders.Add(new Notification
            {
                UserId = r.StudentId,
                Type = "practice_reminder",
                Title = "Nhắc làm bài tập",
                Message = $"Bạn chưa hoàn thành: {r.Title}",
                Url = "/my-learning",
                DedupKey = $"reminder:practice:{r.RecipientId}:{today}"
            });
        }

        // 2. Nhắc giáo viên chấm Speaking
        var ungraded = await db.SpeakingSubmissions
            .AsNoTracking()
            .Where(s =>
                s.GradedAt == null &&
                s.LessonId != null)
            .Select(s => new
            {
                s.SubmissionId,
                InstructorId =
                    s.Lesson!.Module!.Course.InstructorId
            })
            .ToListAsync(ct);

        foreach (var s in ungraded)
        {
            reminders.Add(new Notification
            {
                UserId = s.InstructorId,
                Type = "grading_reminder",
                Title = "Nhắc chấm bài",
                Message = "Bạn có bài Speaking chưa chấm.",
                Url = "/instructor",
                DedupKey = $"reminder:grading:{s.SubmissionId}:{today}"
            });
        }

        // 3. Kiểm tra thông báo đã gửi trong ngày
        var keys = reminders
            .Select(n => n.DedupKey!)
            .ToList();

        if (keys.Count == 0)
            return;

        var existing = await db.Notifications
            .AsNoTracking()
            .Where(n =>
                n.DedupKey != null &&
                keys.Contains(n.DedupKey))
            .Select(n => n.DedupKey)
            .ToListAsync(ct);

        // 4. Chỉ thêm thông báo chưa tồn tại
        var newNotifications = reminders
            .Where(n => !existing.Contains(n.DedupKey))
            .ToList();

        if (newNotifications.Count == 0)
            return;

        db.Notifications.AddRange(newNotifications);

        await db.SaveChangesAsync(ct);
    }
}
