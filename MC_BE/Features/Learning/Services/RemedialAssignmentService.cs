using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Services;

public sealed class RemedialAssignmentService : IRemedialAssignmentService
{
    private readonly SmartMcDbContext _db;
    private readonly ICourseLearningAccessService _courseAccess;

    public RemedialAssignmentService(SmartMcDbContext db, ICourseLearningAccessService courseAccess)
    {
        _db = db;
        _courseAccess = courseAccess;
    }

    public async Task<List<RemedialAssignmentDto>> GetForInstructorAsync(int instructorId, int courseId)
    {
        await EnsureInstructorOwnsCourseAsync(instructorId, courseId);
        return await BuildQuery().Where(x => x.CourseId == courseId && x.IsActive)
            .SelectMany(x => x.Recipients.Select(r => new RemedialAssignmentDto
            {
                RemedialAssignmentId = x.RemedialAssignmentId, CourseId = x.CourseId, Title = x.Title, Reason = x.Reason,
                StudentId = r.StudentId,
                ContentType = x.LessonId.HasValue ? "LESSON" : x.QuizId.HasValue ? "QUIZ" : "SPEAKING",
                ContentId = x.LessonId ?? x.QuizId ?? x.SpeakingScriptId ?? 0,
                ContentTitle = x.Lesson != null ? x.Lesson.Title : x.Quiz != null ? x.Quiz.Title : x.SpeakingScript!.Title,
                TargetAssessmentId = x.TargetQuizId ?? x.TargetSpeakingScriptId,
                TargetAssessmentType = x.TargetQuizId.HasValue ? "QUIZ" : x.TargetSpeakingScriptId.HasValue ? "SPEAKING" : null,
                MaxAttempts = x.MaxAttempts, HasUnlimitedAttempts = x.MaxAttempts == 0,
                RetakeAttemptsGranted = x.RetakeAttemptsGranted,
                RemainingAttempts = x.MaxAttempts == 0 ? null : Math.Max(0, x.MaxAttempts - r.AttemptsUsed),
                IsActive = x.IsActive, DueAt = null, Status = r.Status,
                AssignedAt = r.AssignedAt, CompletedAt = r.CompletedAt, AttemptsUsed = r.AttemptsUsed,
                HasActiveRetakeGrant = _db.RemedialRetakeGrants.Any(g => g.RecipientId == r.RecipientId && g.UsedAt == null && g.AttemptsRemaining > 0 && g.ExpiresAt > DateTime.UtcNow),
                RetakeAttemptsRemaining = _db.RemedialRetakeGrants.Where(g => g.RecipientId == r.RecipientId && g.UsedAt == null && g.AttemptsRemaining > 0 && g.ExpiresAt > DateTime.UtcNow).Select(g => g.AttemptsRemaining).FirstOrDefault(),
                RetakeExpiresAt = _db.RemedialRetakeGrants.Where(g => g.RecipientId == r.RecipientId && g.UsedAt == null && g.AttemptsRemaining > 0 && g.ExpiresAt > DateTime.UtcNow)
                    .OrderBy(g => g.ExpiresAt).Select(g => (DateTime?)g.ExpiresAt).FirstOrDefault(),
                AssignedByName = x.AssignedBy.FullName
            }))
            .OrderByDescending(x => x.AssignedAt).ToListAsync();
    }

    public async Task<List<RemedialAssignmentDto>> GetForLearnerAsync(int learnerId, int courseId)
    {
        var hasAccess = await _courseAccess.CanAccessCourseAsync(courseId, learnerId, isAdmin: false);
        if (!hasAccess) return new List<RemedialAssignmentDto>();
        return await BuildQuery().Where(x => x.CourseId == courseId && x.IsActive && x.Recipients.Any(r => r.StudentId == learnerId))
            .SelectMany(x => x.Recipients.Where(r => r.StudentId == learnerId).Select(r => new RemedialAssignmentDto
            {
                RemedialAssignmentId = x.RemedialAssignmentId, CourseId = x.CourseId, Title = x.Title, Reason = x.Reason,
                StudentId = r.StudentId,
                ContentType = x.LessonId.HasValue ? "LESSON" : x.QuizId.HasValue ? "QUIZ" : "SPEAKING",
                ContentId = x.LessonId ?? x.QuizId ?? x.SpeakingScriptId ?? 0,
                ContentTitle = x.Lesson != null ? x.Lesson.Title : x.Quiz != null ? x.Quiz.Title : x.SpeakingScript!.Title,
                TargetAssessmentId = x.TargetQuizId ?? x.TargetSpeakingScriptId,
                TargetAssessmentType = x.TargetQuizId.HasValue ? "QUIZ" : x.TargetSpeakingScriptId.HasValue ? "SPEAKING" : null,
                MaxAttempts = x.MaxAttempts, HasUnlimitedAttempts = x.MaxAttempts == 0,
                RetakeAttemptsGranted = x.RetakeAttemptsGranted,
                RemainingAttempts = x.MaxAttempts == 0 ? null : Math.Max(0, x.MaxAttempts - r.AttemptsUsed),
                IsActive = x.IsActive, DueAt = null, Status = r.Status,
                AssignedAt = r.AssignedAt, CompletedAt = r.CompletedAt, AttemptsUsed = r.AttemptsUsed,
                HasActiveRetakeGrant = _db.RemedialRetakeGrants.Any(g => g.RecipientId == r.RecipientId && g.UsedAt == null && g.AttemptsRemaining > 0 && g.ExpiresAt > DateTime.UtcNow),
                RetakeAttemptsRemaining = _db.RemedialRetakeGrants.Where(g => g.RecipientId == r.RecipientId && g.UsedAt == null && g.AttemptsRemaining > 0 && g.ExpiresAt > DateTime.UtcNow).Select(g => g.AttemptsRemaining).FirstOrDefault(),
                RetakeExpiresAt = _db.RemedialRetakeGrants.Where(g => g.RecipientId == r.RecipientId && g.UsedAt == null && g.AttemptsRemaining > 0 && g.ExpiresAt > DateTime.UtcNow)
                    .OrderBy(g => g.ExpiresAt).Select(g => (DateTime?)g.ExpiresAt).FirstOrDefault(),
                AssignedByName = x.AssignedBy.FullName
            }))
            .OrderByDescending(x => x.AssignedAt).ToListAsync();
    }

    public async Task<RemedialAssignmentDto> CreateOrExtendAsync(int instructorId, int courseId, CreateRemedialAssignmentRequest request)
    {
        await EnsureInstructorOwnsCourseAsync(instructorId, courseId);
        var contentCount = (request.LessonId.HasValue ? 1 : 0) + (request.QuizId.HasValue ? 1 : 0) + (request.SpeakingScriptId.HasValue ? 1 : 0);
        var targetCount = (request.TargetQuizId.HasValue ? 1 : 0) + (request.TargetSpeakingScriptId.HasValue ? 1 : 0);
        if (contentCount != 1 || targetCount > 1) throw new ArgumentException("Chọn chính xác một nội dung bổ trợ và tối đa một bài đánh giá chính thức cần làm lại.");
        if (request.StudentIds.Count == 0 || request.StudentIds.Any(id => id <= 0)) throw new ArgumentException("Danh sách học viên không hợp lệ.");
        if (request.RetakeAttemptsGranted is < 1 or > 20) throw new ArgumentException("Số lượt làm lại được cấp phải từ 1 đến 20.");
        var studentIds = request.StudentIds.Distinct().ToList();
        await EnsureStudentsNeedSupportAsync(courseId, studentIds);

        Lesson? lesson = null; Quiz? quiz = null; SpeakingScript? script = null;
        if (request.LessonId.HasValue) lesson = await _db.Lessons.Include(x => x.Course).FirstOrDefaultAsync(x => x.LessonId == request.LessonId && x.CourseId == courseId);
        if (request.QuizId.HasValue) quiz = await _db.Quizzes.FirstOrDefaultAsync(x => x.QuizId == request.QuizId && x.CourseId == courseId);
        if (request.SpeakingScriptId.HasValue) script = await _db.SpeakingScripts.FirstOrDefaultAsync(x => x.ScriptId == request.SpeakingScriptId && x.CourseId == courseId);
        if ((request.LessonId.HasValue && lesson == null) || (request.QuizId.HasValue && quiz == null) || (request.SpeakingScriptId.HasValue && script == null))
            throw new KeyNotFoundException("Không tìm thấy nội dung bổ trợ trong khóa học.");
        if (lesson?.IsRemedial == false || quiz?.IsRemedial == false || script?.IsRemedial == false)
            throw new ArgumentException("Chỉ được giao nội dung đã được đánh dấu là bài bổ trợ; không thể chuyển bài học chính thức thành bài riêng cho một học viên.");
        if (request.TargetQuizId.HasValue && (request.TargetQuizId == request.QuizId ||
            !await _db.Quizzes.AnyAsync(x => x.QuizId == request.TargetQuizId && x.CourseId == courseId && !x.IsRemedial)))
            throw new KeyNotFoundException("Quiz đích phải là quiz chính thức, khác nội dung bổ trợ và thuộc khóa học này.");
        if (request.TargetQuizId.HasValue && await _db.QuizAttempts.AnyAsync(x => studentIds.Contains(x.UserId) && x.QuizId == request.TargetQuizId && x.ResultStatus == QuizAttemptStatus.PASSED))
            throw new InvalidOperationException("Học viên đã đạt quiz này; không cần giao bài bổ trợ để mở lượt làm lại.");
        if (request.TargetSpeakingScriptId.HasValue && (request.TargetSpeakingScriptId == request.SpeakingScriptId ||
            !await _db.SpeakingScripts.AnyAsync(x => x.ScriptId == request.TargetSpeakingScriptId && x.CourseId == courseId && !x.IsRemedial)))
            throw new KeyNotFoundException("Speaking đích phải là bài chính thức khác nội dung bổ trợ và thuộc khóa học này.");
        if (request.TargetSpeakingScriptId.HasValue && await _db.SpeakingSubmissions.AnyAsync(x => studentIds.Contains(x.LearnerId) && x.ScriptId == request.TargetSpeakingScriptId && x.Score >= 80))
            throw new InvalidOperationException("Học viên đã đạt bài Speaking này; không cần giao bài bổ trợ để mở lượt làm lại.");

        var enrolledIds = await _db.Enrollments.Where(e => e.CourseId == courseId && studentIds.Contains(e.LearnerId) && e.Status == "ACTIVE" && (!e.ExpiresAt.HasValue || e.ExpiresAt.Value > DateTime.UtcNow))
            .Select(e => e.LearnerId).Distinct().ToListAsync();
        if (enrolledIds.Count != studentIds.Count) throw new ArgumentException("Một hoặc nhiều học viên không còn quyền học khóa học này.");

        await using var tx = await _db.Database.BeginTransactionAsync();
        var task = await _db.RemedialAssignments.FirstOrDefaultAsync(x => x.CourseId == courseId && x.IsActive &&
            x.LessonId == request.LessonId && x.QuizId == request.QuizId && x.SpeakingScriptId == request.SpeakingScriptId &&
            x.TargetQuizId == request.TargetQuizId && x.TargetSpeakingScriptId == request.TargetSpeakingScriptId &&
            x.RetakeAttemptsGranted == request.RetakeAttemptsGranted &&
            !x.Recipients.Any(r => studentIds.Contains(r.StudentId)));
        var now = DateTime.UtcNow;
        if (task == null)
        {
            task = new RemedialAssignment
            {
                CourseId = courseId, Title = request.Title.Trim(), Reason = request.Reason.Trim(),
                LessonId = request.LessonId, QuizId = request.QuizId, SpeakingScriptId = request.SpeakingScriptId,
                TargetQuizId = request.TargetQuizId, TargetSpeakingScriptId = request.TargetSpeakingScriptId,
                AssignedById = instructorId, MaxAttempts = request.MaxAttempts,
                RetakeAttemptsGranted = request.RetakeAttemptsGranted, CreatedAt = now, UpdatedAt = now
            };
            _db.RemedialAssignments.Add(task);
        }
        else
        {
            var samePlan = task.Title == request.Title.Trim() && task.Reason == request.Reason.Trim() &&
                task.MaxAttempts == request.MaxAttempts && task.TargetQuizId == request.TargetQuizId &&
                task.TargetSpeakingScriptId == request.TargetSpeakingScriptId &&
                task.RetakeAttemptsGranted == request.RetakeAttemptsGranted;
            if (!samePlan)
                throw new InvalidOperationException("Nội dung này đã được giao với một cấu hình khác. Hãy dùng cùng tiêu đề, lý do, số lượt bổ trợ, số lượt làm lại và bài đích để thêm học viên vào đợt hiện tại.");
        }
        await _db.SaveChangesAsync();

        var existingIds = await _db.RemedialAssignmentRecipients.Where(x => x.RemedialAssignmentId == task.RemedialAssignmentId && studentIds.Contains(x.StudentId)).Select(x => x.StudentId).ToListAsync();
        foreach (var studentId in studentIds.Except(existingIds))
        {
            task.Recipients.Add(new RemedialAssignmentRecipient
            {
                StudentId = studentId, AssignedAt = now, DueAt = null, Status = "ASSIGNED", UpdatedAt = now
            });
            task.Events.Add(new RemedialAssignmentEvent
            {
                StudentId = studentId, ActorId = instructorId, EventType = "ASSIGNED",
                Details = $"Giao nội dung bổ trợ: {task.Title}; cấp {task.RetakeAttemptsGranted} lượt làm lại khi đạt.", CreatedAt = now
            });
        }
        await _db.SaveChangesAsync();
        await tx.CommitAsync();
        return (await GetForInstructorAsync(instructorId, courseId)).First(x => x.RemedialAssignmentId == task.RemedialAssignmentId && studentIds.Contains(x.StudentId));
    }

    public async Task<List<RemedialAssignmentEventDto>> GetHistoryAsync(int instructorId, int assignmentId)
    {
        var task = await _db.RemedialAssignments.Include(x => x.Course).FirstOrDefaultAsync(x => x.RemedialAssignmentId == assignmentId);
        if (task == null) throw new KeyNotFoundException("Không tìm thấy nhiệm vụ bổ trợ.");
        await EnsureInstructorOwnsCourseAsync(instructorId, task.CourseId);
        return await _db.RemedialAssignmentEvents.Where(x => x.RemedialAssignmentId == assignmentId)
            .OrderByDescending(x => x.CreatedAt).Select(x => new RemedialAssignmentEventDto
            {
                EventId = x.EventId, StudentId = x.StudentId, EventType = x.EventType, Details = x.Details,
                CreatedAt = x.CreatedAt, ActorName = _db.Users.Where(u => u.UserId == x.ActorId).Select(u => u.FullName).FirstOrDefault() ?? string.Empty
            }).ToListAsync();
    }

    public async Task<bool> CanAccessContentAsync(int learnerId, string contentType, int contentId)
    {
        var recipient = await FindRecipientAsync(learnerId, contentType, contentId);
        return recipient != null && recipient.Status != "REVOKED" &&
            await _courseAccess.CanAccessCourseAsync(recipient.Assignment.CourseId, learnerId, isAdmin: false);
    }

    public async Task<bool> CanStartAttemptAsync(int learnerId, string contentType, int contentId)
    {
        var recipient = await FindRecipientAsync(learnerId, contentType, contentId);
        return recipient != null && recipient.Status != "REVOKED" && recipient.Status != "COMPLETED" &&
            (recipient.Assignment.MaxAttempts == 0 || recipient.AttemptsUsed < recipient.Assignment.MaxAttempts) &&
            await _courseAccess.CanAccessCourseAsync(recipient.Assignment.CourseId, learnerId, isAdmin: false);
    }

    public async Task RecordAttemptResultAsync(int learnerId, string contentType, int contentId, bool passed)
    {
        var recipient = await FindRecipientAsync(learnerId, contentType, contentId);
        if (recipient == null) return;
        if (recipient.Assignment.MaxAttempts > 0 && recipient.AttemptsUsed >= recipient.Assignment.MaxAttempts) throw new InvalidOperationException("Bạn đã dùng hết số lượt làm bài bổ trợ. Hãy liên hệ giảng viên qua khung chat để yêu cầu thêm lượt.");
        recipient.AttemptsUsed++;
        recipient.UpdatedAt = DateTime.UtcNow;
        if (passed)
        {
            recipient.Status = "COMPLETED";
            recipient.CompletedAt = DateTime.UtcNow;
            await IssueRetakeGrantIfNeededAsync(recipient, learnerId);
        }
        _db.RemedialAssignmentEvents.Add(new RemedialAssignmentEvent
        {
            RemedialAssignmentId = recipient.RemedialAssignmentId, StudentId = learnerId, ActorId = learnerId,
            EventType = passed ? "COMPLETED" : "ATTEMPTED",
            Details = $"Lượt bổ trợ {recipient.AttemptsUsed}/{recipient.Assignment.MaxAttempts}" +
                (passed ? $"; đạt yêu cầu; cấp {recipient.Assignment.RetakeAttemptsGranted} lượt làm lại trong 7 ngày" : "; chưa đạt"),
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public async Task CompleteSpeakingAttemptAsync(int learnerId, int scriptId, bool passed)
    {
        var recipient = await FindRecipientAsync(learnerId, "SPEAKING", scriptId);
        if (recipient == null) return;
        if (passed)
        {
            recipient.Status = "COMPLETED";
            recipient.CompletedAt = DateTime.UtcNow;
            await IssueRetakeGrantIfNeededAsync(recipient, learnerId);
        }
        recipient.UpdatedAt = DateTime.UtcNow;
        _db.RemedialAssignmentEvents.Add(new RemedialAssignmentEvent
        {
            RemedialAssignmentId = recipient.RemedialAssignmentId, StudentId = learnerId, ActorId = learnerId,
            EventType = passed ? "COMPLETED" : "GRADED_NOT_PASSED",
            Details = passed ? "Bài bổ trợ Speaking đạt yêu cầu." : "Bài bổ trợ Speaking chưa đạt.",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public async Task RevokeSpeakingRetakeGrantsAsync(int learnerId, int scriptId)
    {
        var grants = await _db.RemedialRetakeGrants
            .Where(x => x.LearnerId == learnerId && x.TargetSpeakingScriptId == scriptId &&
                !x.UsedAt.HasValue && x.AttemptsRemaining > 0)
            .ToListAsync();
        var now = DateTime.UtcNow;
        foreach (var grant in grants)
        {
            grant.AttemptsRemaining = 0;
            grant.UsedAt = now;
        }
        if (grants.Count > 0) await _db.SaveChangesAsync();
    }

    public async Task CompleteLessonAsync(int learnerId, int lessonId)
    {
        var recipient = await FindRecipientAsync(learnerId, "LESSON", lessonId);
        if (recipient == null || recipient.Status == "COMPLETED") return;
        recipient.Status = "COMPLETED";
        recipient.CompletedAt = DateTime.UtcNow;
        recipient.UpdatedAt = DateTime.UtcNow;
        await IssueRetakeGrantIfNeededAsync(recipient, learnerId);
        _db.RemedialAssignmentEvents.Add(new RemedialAssignmentEvent
        {
            RemedialAssignmentId = recipient.RemedialAssignmentId, StudentId = learnerId, ActorId = learnerId,
            EventType = "COMPLETED", Details = "Đã xem xong bài học bổ trợ.", CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public Task<bool> HasSpeakingRetakeGrantAsync(int learnerId, int scriptId) =>
        _db.RemedialRetakeGrants.AnyAsync(x => x.LearnerId == learnerId && x.TargetSpeakingScriptId == scriptId && !x.UsedAt.HasValue && x.AttemptsRemaining > 0 && x.ExpiresAt > DateTime.UtcNow && x.Recipient.Status != "REVOKED" && x.Recipient.Assignment.IsActive);

    public async Task ConsumeSpeakingRetakeGrantAsync(int learnerId, int scriptId)
    {
        var grant = await _db.RemedialRetakeGrants.Where(x => x.LearnerId == learnerId && x.TargetSpeakingScriptId == scriptId && !x.UsedAt.HasValue && x.AttemptsRemaining > 0 && x.ExpiresAt > DateTime.UtcNow && x.Recipient.Status != "REVOKED" && x.Recipient.Assignment.IsActive)
            .OrderBy(x => x.GrantedAt).FirstOrDefaultAsync();
        if (grant == null) throw new InvalidOperationException("Không có lượt làm lại Speaking được giảng viên mở.");
        grant.AttemptsRemaining--;
        if (grant.AttemptsRemaining == 0) grant.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task IssueRetakeGrantIfNeededAsync(RemedialAssignmentRecipient recipient, int learnerId)
    {
        if (!recipient.Assignment.TargetQuizId.HasValue && !recipient.Assignment.TargetSpeakingScriptId.HasValue)
            return;

        // One grant row represents a batch of N one-time attempts. Count every
        // row for this recipient (including consumed/expired rows) for idempotency.
        if (await _db.RemedialRetakeGrants.AnyAsync(x => x.RecipientId == recipient.RecipientId))
            return;

        var attempts = Math.Clamp(recipient.Assignment.RetakeAttemptsGranted, 1, 20);
        var now = DateTime.UtcNow;
        _db.RemedialRetakeGrants.Add(new RemedialRetakeGrant
        {
            RecipientId = recipient.RecipientId,
            LearnerId = learnerId,
            TargetQuizId = recipient.Assignment.TargetQuizId,
            TargetSpeakingScriptId = recipient.Assignment.TargetSpeakingScriptId,
            GrantedAt = now,
            ExpiresAt = now.AddDays(7),
            AttemptsGranted = attempts,
            AttemptsRemaining = attempts
        });
    }

    private IQueryable<RemedialAssignment> BuildQuery() => _db.RemedialAssignments.AsNoTracking()
        .Include(x => x.Lesson).Include(x => x.Quiz).Include(x => x.SpeakingScript).Include(x => x.AssignedBy).Include(x => x.Recipients);

    private async Task EnsureStudentsNeedSupportAsync(int courseId, List<int> studentIds)
    {
        var now = DateTime.UtcNow;
        var moduleIds = await _db.Modules.AsNoTracking().Where(x => x.CourseId == courseId).Select(x => x.ModuleId).ToListAsync();
        var lessonIds = await _db.Lessons.AsNoTracking().Where(x => x.CourseId == courseId && !x.IsRemedial).Select(x => x.LessonId).ToListAsync();
        var quizzes = await _db.Quizzes.AsNoTracking()
            .Where(q => !q.IsRemedial &&
                q.Status == QuizStatus.ACTIVE &&
                (q.CourseId == courseId || (q.ModuleId.HasValue && moduleIds.Contains(q.ModuleId.Value)) || (q.LessonId.HasValue && lessonIds.Contains(q.LessonId.Value))))
            .Select(q => new { q.QuizId, q.Purpose, q.LessonId, q.ModuleId })
            .ToListAsync();
        var scripts = await _db.SpeakingScripts.AsNoTracking()
            .Where(s => s.CourseId == courseId && s.Status == SpeakingScriptStatus.PUBLISHED && !s.IsRemedial)
            .Select(s => new { s.ScriptId, s.DueAt })
            .ToListAsync();
        var quizIds = quizzes.Select(x => x.QuizId).ToList();
        var scriptIds = scripts.Select(x => x.ScriptId).ToList();
        var attempts = quizIds.Count == 0 ? new List<QuizAttempt>() : await _db.QuizAttempts.AsNoTracking()
            .Where(x => studentIds.Contains(x.UserId) && quizIds.Contains(x.QuizId)).ToListAsync();
        var submissions = scriptIds.Count == 0 ? new List<SpeakingSubmission>() : await _db.SpeakingSubmissions.AsNoTracking()
            .Where(x => studentIds.Contains(x.LearnerId) && x.ScriptId.HasValue && scriptIds.Contains(x.ScriptId.Value)).ToListAsync();

        // The deadline belongs to the learner, not to the shared Quiz record.
        var videoLessons = await _db.Lessons.AsNoTracking()
            .Where(l => l.CourseId == courseId && !l.IsRemedial &&
                l.Status == LessonStatus.ACTIVE &&
                l.CourseMaterials.Any(m => m.MaterialType == MaterialType.VIDEO &&
                    ((m.ObjectKey != null && m.ObjectKey != "") ||
                     (m.FileUrl != null && m.FileUrl != ""))))
            .Select(l => new { l.LessonId, l.ModuleId, l.OrderIndex }).ToListAsync();
        var videoIds = videoLessons.Select(l => l.LessonId).ToList();
        var progress = await _db.LessonProgresses.AsNoTracking()
            .Where(x => videoIds.Contains(x.LessonId) &&
                studentIds.Contains(x.Enrollment.LearnerId) &&
                x.Enrollment.CourseId == courseId &&
                (x.IsCompleted || x.Status == LessonProgressStatus.COMPLETED))
            .Select(x => new { x.Enrollment.LearnerId, x.LessonId,
                Date = x.CompletedAt ?? x.UpdatedAt }).ToListAsync();
        var completedAt = progress.GroupBy(x => (x.LearnerId, x.LessonId))
            .ToDictionary(g => g.Key, g => g.Min(x => x.Date));

        bool IsExpired(int studentId, int? lessonId, int? moduleId, QuizPurpose purpose)
        {
            if (purpose == QuizPurpose.FINAL_ASSESSMENT) return false;
            var anchor = purpose == QuizPurpose.CHAPTER_ASSESSMENT
                ? videoLessons.Where(l => l.ModuleId == moduleId)
                    .OrderByDescending(l => l.OrderIndex).ThenByDescending(l => l.LessonId)
                    .Select(l => (int?)l.LessonId).FirstOrDefault()
                : lessonId;
            return anchor.HasValue &&
                completedAt.TryGetValue((studentId, anchor.Value), out var date) &&
                now >= date.AddDays(7);
        }

        var unsupported = studentIds.Where(studentId =>
        {
            var quizNeedsSupport = quizzes.Any(quiz =>
            {
                var learnerAttempts = attempts.Where(x => x.UserId == studentId && x.QuizId == quiz.QuizId).ToList();
                if (learnerAttempts.Any(x => x.ResultStatus == QuizAttemptStatus.PASSED)) return false;
                return IsExpired(studentId, quiz.LessonId, quiz.ModuleId, quiz.Purpose);
            });
            var speakingNeedsSupport = scripts.Any(script =>
            {
                var learnerSubmissions = submissions.Where(x => x.LearnerId == studentId && x.ScriptId == script.ScriptId).ToList();
                if (learnerSubmissions.Any(x => x.Score >= 80)) return false;
                var latest = learnerSubmissions.OrderByDescending(x => x.SubmittedAt).FirstOrDefault();
                if (latest != null && !latest.Score.HasValue) return false;
                return (script.DueAt.HasValue && script.DueAt.Value <= now) || latest?.Score < 80;
            });
            return !quizNeedsSupport && !speakingNeedsSupport;
        }).ToList();

        if (unsupported.Count > 0)
            throw new InvalidOperationException("Chỉ có thể giao bài bổ trợ cho học viên đang có quiz hoặc Speaking chưa đạt/quá hạn. Học viên đã đạt hoặc chưa có vấn đề cần hỗ trợ: " + string.Join(", ", unsupported));
    }

    private async Task<RemedialAssignmentRecipient?> FindRecipientAsync(int learnerId, string contentType, int contentId) =>
        await _db.RemedialAssignmentRecipients.Include(r => r.Assignment)
            .Where(r => r.StudentId == learnerId && r.Assignment.IsActive &&
                ((contentType == "LESSON" && r.Assignment.LessonId == contentId) || (contentType == "QUIZ" && r.Assignment.QuizId == contentId) || (contentType == "SPEAKING" && r.Assignment.SpeakingScriptId == contentId)))
            .OrderByDescending(r => r.AssignedAt).ThenByDescending(r => r.RecipientId).FirstOrDefaultAsync();

    private async Task EnsureInstructorOwnsCourseAsync(int instructorId, int courseId)
    {
        if (!await _db.Courses.AnyAsync(x => x.CourseId == courseId && x.InstructorId == instructorId))
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý học viên khóa học này.");
    }

}
