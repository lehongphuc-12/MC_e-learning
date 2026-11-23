
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
                && r.Status != "REVOKED"
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

        // 2. Nhắc giáo viên chấm Speaking, kể cả bài chỉ gắn với Script.
        var ungraded = await db.SpeakingSubmissions.AsNoTracking()
            .Where(s => s.GradedAt == null)
            .Select(s => new
            {
                s.SubmissionId,
                InstructorId = s.LessonId != null
                    ? (int?)s.Lesson!.Module!.Course.InstructorId
                    : s.ScriptId != null ? (int?)s.SpeakingScript!.Course.InstructorId : null
            }).ToListAsync(ct);

        foreach (var s in ungraded.Where(x => x.InstructorId.HasValue))
        {
            reminders.Add(new Notification
            {
                UserId = s.InstructorId!.Value, Type = "grading_reminder",
                Title = "Nhắc chấm bài", Message = "Bạn có bài Speaking chưa chấm.",
                Url = $"/instructor/speaking-submissions?submissionId={s.SubmissionId}", DedupKey = $"reminder:grading:{s.SubmissionId}:{today}"
            });
        }

        // 3. Chỉ nhắc Quiz có câu cần giáo viên chấm, không nhắc Quiz đã tự chấm.
        var pendingQuizzes = await db.QuizAttempts.AsNoTracking()
            .Where(a => a.SubmittedAt != null && a.ResultStatus == MC_BE.Core.Enums.QuizAttemptStatus.PENDING_GRADING)
            .Select(a => new
            {
                a.AttemptId,
                a.QuizId,
                InstructorId = a.Quiz.CourseId != null ? (int?)a.Quiz.Course!.InstructorId
                    : a.Quiz.LessonId != null ? (int?)a.Quiz.Lesson!.Module!.Course.InstructorId
                    : (int?)a.Quiz.CreatedById
            }).ToListAsync(ct);
        foreach (var a in pendingQuizzes.Where(x => x.InstructorId.HasValue))
        {
            reminders.Add(new Notification
            {
                UserId = a.InstructorId!.Value, Type = "grading_reminder",
                Title = "Nhắc chấm Quiz", Message = "Bạn có bài Quiz cần chấm thủ công.",
                Url = $"/instructor/quizzes/{a.QuizId}/grading?attemptId={a.AttemptId}", DedupKey = $"reminder:grading:quiz:{a.AttemptId}:{today}"
            });
        }

        // 4. Cảnh báo Practice More quá hạn: chỉ khi giáo viên đã đặt DueAt.
        var overduePractice = await (
            from r in db.RemedialAssignmentRecipients.AsNoTracking()
            join a in db.RemedialAssignments.AsNoTracking()
                on r.RemedialAssignmentId equals a.RemedialAssignmentId
            where a.IsActive && r.DueAt.HasValue && r.DueAt.Value < DateTime.UtcNow
                && r.CompletedAt == null && r.Status != "COMPLETED" && r.Status != "REVOKED"
            select new { r.RecipientId, r.StudentId, a.AssignedById, a.Title, a.CourseId }
        ).ToListAsync(ct);

        foreach (var r in overduePractice.Where(x => x.AssignedById != x.StudentId))
        {
            reminders.Add(new Notification
            {
                UserId = r.AssignedById,
                Type = "assignment_overdue",
                Title = "Học viên quá hạn Practice More",
                Message = $"Học viên #{r.StudentId} chưa hoàn thành bài bổ sung '{r.Title}' đúng hạn.",
                Url = $"/instructor/courses/{r.CourseId}/students?studentId={r.StudentId}",
                DedupKey = $"overdue:practice:{r.RecipientId}"
            });
        }

        // 5. Cảnh báo Speaking quá hạn: chưa có lần nộp nào cho script này.
        // Chỉ xét học viên còn ghi danh ACTIVE, script chính thức có DueAt.
        var now = DateTime.UtcNow;
        var overdueSpeaking = await (
            from script in db.SpeakingScripts.AsNoTracking()
            join enrollment in db.Enrollments.AsNoTracking()
                on script.CourseId equals enrollment.CourseId
            where !script.IsRemedial && script.DueAt.HasValue && script.DueAt.Value < now
                && enrollment.Status == "ACTIVE"
                && (!enrollment.ExpiresAt.HasValue || enrollment.ExpiresAt.Value > now)
                && !db.SpeakingSubmissions.Any(s => s.ScriptId == script.ScriptId
                    && s.LearnerId == enrollment.LearnerId)
            select new { script.ScriptId, script.Course.InstructorId, enrollment.LearnerId }
        ).ToListAsync(ct);

        foreach (var s in overdueSpeaking.Where(x => x.InstructorId != x.LearnerId))
        {
            reminders.Add(new Notification
            {
                UserId = s.InstructorId,
                Type = "assignment_overdue",
                Title = "Học viên quá hạn Speaking",
                Message = $"Học viên #{s.LearnerId} chưa nộp bài Speaking #{s.ScriptId} đúng hạn.",
                Url = "/instructor/speaking-submissions",
                DedupKey = $"overdue:speaking:{s.ScriptId}:{s.LearnerId}"
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
