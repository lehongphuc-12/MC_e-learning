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
                MaxAttempts = x.MaxAttempts, IsActive = x.IsActive, DueAt = r.DueAt, Status = r.Status,
                AssignedAt = r.AssignedAt, CompletedAt = r.CompletedAt, AttemptsUsed = r.AttemptsUsed,
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
                MaxAttempts = x.MaxAttempts, IsActive = x.IsActive, DueAt = r.DueAt, Status = r.Status,
                AssignedAt = r.AssignedAt, CompletedAt = r.CompletedAt, AttemptsUsed = r.AttemptsUsed,
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
        if (request.DueAt.HasValue && request.DueAt.Value <= DateTime.UtcNow) throw new ArgumentException("Hạn hoàn thành phải nằm trong tương lai.");

        Lesson? lesson = null; Quiz? quiz = null; SpeakingScript? script = null;
        if (request.LessonId.HasValue) lesson = await _db.Lessons.Include(x => x.Course).FirstOrDefaultAsync(x => x.LessonId == request.LessonId && x.CourseId == courseId);
        if (request.QuizId.HasValue) quiz = await _db.Quizzes.FirstOrDefaultAsync(x => x.QuizId == request.QuizId && x.CourseId == courseId);
        if (request.SpeakingScriptId.HasValue) script = await _db.SpeakingScripts.FirstOrDefaultAsync(x => x.ScriptId == request.SpeakingScriptId && x.CourseId == courseId);
        if ((request.LessonId.HasValue && lesson == null) || (request.QuizId.HasValue && quiz == null) || (request.SpeakingScriptId.HasValue && script == null))
            throw new KeyNotFoundException("Không tìm thấy nội dung bổ trợ trong khóa học.");
        if (lesson?.IsRemedial == false || quiz?.IsRemedial == false || script?.IsRemedial == false)
            throw new ArgumentException("Chỉ được giao nội dung đã được đánh dấu là bài bổ trợ; không thể chuyển bài học chính thức thành bài riêng cho một học viên.");
        if (request.TargetQuizId.HasValue && (request.TargetQuizId == request.QuizId ||
            !await _db.Quizzes.AnyAsync(x => x.QuizId == request.TargetQuizId && x.CourseId == courseId && !x.IsRemedial && x.Purpose != QuizPurpose.PRACTICE)))
            throw new KeyNotFoundException("Quiz đích phải là bài đánh giá chính thức khác nội dung bổ trợ và thuộc khóa học này.");
        if (request.TargetSpeakingScriptId.HasValue && (request.TargetSpeakingScriptId == request.SpeakingScriptId ||
            !await _db.SpeakingScripts.AnyAsync(x => x.ScriptId == request.TargetSpeakingScriptId && x.CourseId == courseId && !x.IsRemedial)))
            throw new KeyNotFoundException("Speaking đích phải là bài chính thức khác nội dung bổ trợ và thuộc khóa học này.");

        var studentIds = request.StudentIds.Distinct().ToList();
        var enrolledIds = await _db.Enrollments.Where(e => e.CourseId == courseId && studentIds.Contains(e.LearnerId) && e.Status == "ACTIVE" && (!e.ExpiresAt.HasValue || e.ExpiresAt.Value > DateTime.UtcNow))
            .Select(e => e.LearnerId).Distinct().ToListAsync();
        if (enrolledIds.Count != studentIds.Count) throw new ArgumentException("Một hoặc nhiều học viên không còn quyền học khóa học này.");

        await using var tx = await _db.Database.BeginTransactionAsync();
        var task = await _db.RemedialAssignments.FirstOrDefaultAsync(x => x.CourseId == courseId && x.IsActive &&
            x.LessonId == request.LessonId && x.QuizId == request.QuizId && x.SpeakingScriptId == request.SpeakingScriptId);
        var now = DateTime.UtcNow;
        if (task == null)
        {
            task = new RemedialAssignment
            {
                CourseId = courseId, Title = request.Title.Trim(), Reason = request.Reason.Trim(),
                LessonId = request.LessonId, QuizId = request.QuizId, SpeakingScriptId = request.SpeakingScriptId,
                TargetQuizId = request.TargetQuizId, TargetSpeakingScriptId = request.TargetSpeakingScriptId,
                AssignedById = instructorId, MaxAttempts = request.MaxAttempts, CreatedAt = now, UpdatedAt = now
            };
            _db.RemedialAssignments.Add(task);
        }
        else
        {
            var samePlan = task.Title == request.Title.Trim() && task.Reason == request.Reason.Trim() &&
                task.MaxAttempts == request.MaxAttempts && task.TargetQuizId == request.TargetQuizId &&
                task.TargetSpeakingScriptId == request.TargetSpeakingScriptId;
            if (!samePlan)
                throw new InvalidOperationException("Nội dung này đã được giao với một cấu hình khác. Hãy dùng cùng tiêu đề, lý do, số lượt và bài đích để thêm học viên vào đợt hiện tại.");
        }
        await _db.SaveChangesAsync();

        var existingIds = await _db.RemedialAssignmentRecipients.Where(x => x.RemedialAssignmentId == task.RemedialAssignmentId && studentIds.Contains(x.StudentId)).Select(x => x.StudentId).ToListAsync();
        foreach (var studentId in studentIds.Except(existingIds))
        {
            task.Recipients.Add(new RemedialAssignmentRecipient
            {
                StudentId = studentId, AssignedAt = now, DueAt = request.DueAt, Status = "ASSIGNED", UpdatedAt = now
            });
            task.Events.Add(new RemedialAssignmentEvent
            {
                StudentId = studentId, ActorId = instructorId, EventType = "ASSIGNED",
                Details = $"Giao nội dung bổ trợ: {task.Title}", CreatedAt = now
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
            recipient.AttemptsUsed < recipient.Assignment.MaxAttempts &&
            await _courseAccess.CanAccessCourseAsync(recipient.Assignment.CourseId, learnerId, isAdmin: false);
    }

    public async Task RecordAttemptResultAsync(int learnerId, string contentType, int contentId, bool passed)
    {
        var recipient = await FindRecipientAsync(learnerId, contentType, contentId);
        if (recipient == null) return;
        if (recipient.AttemptsUsed >= recipient.Assignment.MaxAttempts) throw new InvalidOperationException("Bạn đã dùng hết số lượt làm bài bổ trợ.");
        recipient.AttemptsUsed++;
        recipient.UpdatedAt = DateTime.UtcNow;
        if (passed)
        {
            recipient.Status = "COMPLETED";
            recipient.CompletedAt = DateTime.UtcNow;
            var hasTarget = recipient.Assignment.TargetQuizId.HasValue || recipient.Assignment.TargetSpeakingScriptId.HasValue;
            var grantExists = hasTarget && await _db.RemedialRetakeGrants.AnyAsync(x =>
                x.RecipientId == recipient.RecipientId && x.UsedAt == null);
            if (hasTarget && !grantExists)
            {
                _db.RemedialRetakeGrants.Add(new RemedialRetakeGrant
                {
                    RecipientId = recipient.RecipientId, LearnerId = learnerId,
                    TargetQuizId = recipient.Assignment.TargetQuizId,
                    TargetSpeakingScriptId = recipient.Assignment.TargetSpeakingScriptId,
                    GrantedAt = DateTime.UtcNow
                });
            }
        }
        _db.RemedialAssignmentEvents.Add(new RemedialAssignmentEvent
        {
            RemedialAssignmentId = recipient.RemedialAssignmentId, StudentId = learnerId, ActorId = learnerId,
            EventType = passed ? "COMPLETED" : "ATTEMPTED",
            Details = $"Lượt bổ trợ {recipient.AttemptsUsed}/{recipient.Assignment.MaxAttempts}" + (passed ? "; đạt yêu cầu" : "; chưa đạt"),
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
            var hasTarget = recipient.Assignment.TargetQuizId.HasValue || recipient.Assignment.TargetSpeakingScriptId.HasValue;
            if (hasTarget && !await _db.RemedialRetakeGrants.AnyAsync(x => x.RecipientId == recipient.RecipientId && x.UsedAt == null))
                _db.RemedialRetakeGrants.Add(new RemedialRetakeGrant
                {
                    RecipientId = recipient.RecipientId, LearnerId = learnerId,
                    TargetQuizId = recipient.Assignment.TargetQuizId,
                    TargetSpeakingScriptId = recipient.Assignment.TargetSpeakingScriptId,
                    GrantedAt = DateTime.UtcNow
                });
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

    public async Task CompleteLessonAsync(int learnerId, int lessonId)
    {
        var recipient = await FindRecipientAsync(learnerId, "LESSON", lessonId);
        if (recipient == null || recipient.Status == "COMPLETED") return;
        recipient.Status = "COMPLETED";
        recipient.CompletedAt = DateTime.UtcNow;
        recipient.UpdatedAt = DateTime.UtcNow;
        var hasTarget = recipient.Assignment.TargetQuizId.HasValue || recipient.Assignment.TargetSpeakingScriptId.HasValue;
        if (hasTarget && !await _db.RemedialRetakeGrants.AnyAsync(x => x.RecipientId == recipient.RecipientId && x.UsedAt == null))
            _db.RemedialRetakeGrants.Add(new RemedialRetakeGrant
            {
                RecipientId = recipient.RecipientId, LearnerId = learnerId,
                TargetQuizId = recipient.Assignment.TargetQuizId,
                TargetSpeakingScriptId = recipient.Assignment.TargetSpeakingScriptId,
                GrantedAt = DateTime.UtcNow
            });
        _db.RemedialAssignmentEvents.Add(new RemedialAssignmentEvent
        {
            RemedialAssignmentId = recipient.RemedialAssignmentId, StudentId = learnerId, ActorId = learnerId,
            EventType = "COMPLETED", Details = "Đã xem xong bài học bổ trợ.", CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public Task<bool> HasSpeakingRetakeGrantAsync(int learnerId, int scriptId) =>
        _db.RemedialRetakeGrants.AnyAsync(x => x.LearnerId == learnerId && x.TargetSpeakingScriptId == scriptId && !x.UsedAt.HasValue);

    public async Task ConsumeSpeakingRetakeGrantAsync(int learnerId, int scriptId)
    {
        var grant = await _db.RemedialRetakeGrants.Where(x => x.LearnerId == learnerId && x.TargetSpeakingScriptId == scriptId && !x.UsedAt.HasValue)
            .OrderBy(x => x.GrantedAt).FirstOrDefaultAsync();
        if (grant == null) throw new InvalidOperationException("Không có lượt làm lại Speaking được giảng viên mở.");
        grant.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private IQueryable<RemedialAssignment> BuildQuery() => _db.RemedialAssignments.AsNoTracking()
        .Include(x => x.Lesson).Include(x => x.Quiz).Include(x => x.SpeakingScript).Include(x => x.AssignedBy).Include(x => x.Recipients);

    private async Task<RemedialAssignmentRecipient?> FindRecipientAsync(int learnerId, string contentType, int contentId) =>
        await _db.RemedialAssignmentRecipients.Include(r => r.Assignment).FirstOrDefaultAsync(r => r.StudentId == learnerId && r.Assignment.IsActive &&
            ((contentType == "LESSON" && r.Assignment.LessonId == contentId) || (contentType == "QUIZ" && r.Assignment.QuizId == contentId) || (contentType == "SPEAKING" && r.Assignment.SpeakingScriptId == contentId)));

    private async Task EnsureInstructorOwnsCourseAsync(int instructorId, int courseId)
    {
        if (!await _db.Courses.AnyAsync(x => x.CourseId == courseId && x.InstructorId == instructorId))
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý học viên khóa học này.");
    }

}
