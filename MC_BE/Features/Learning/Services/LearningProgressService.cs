using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Services;

public class LearningProgressService : ILearningProgressService
{
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<LessonProgress> _progressRepository;
    private readonly IGenericRepository<Certificate> _certificateRepository;
    private readonly IGenericRepository<ForumPost> _forumPostRepository;
    private readonly IGenericRepository<ForumComment> _forumCommentRepository;
    private readonly IGenericRepository<ForumReaction> _forumReactionRepository;
    private readonly IGenericRepository<SpeakingSubmission> _submissionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICertificateService _certificateService;
    private readonly ILearningAccessService _access;
    private readonly SmartMcDbContext _db;

    public LearningProgressService(
        IGenericRepository<Enrollment> enrollmentRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<LessonProgress> progressRepository,
        IGenericRepository<Certificate> certificateRepository,
        IGenericRepository<ForumPost> forumPostRepository,
        IGenericRepository<ForumComment> forumCommentRepository,
        IGenericRepository<ForumReaction> forumReactionRepository,
        IGenericRepository<SpeakingSubmission> submissionRepository,
        IUnitOfWork unitOfWork,
        ICertificateService certificateService,
        ILearningAccessService access,
        SmartMcDbContext db)
    {
        _enrollmentRepository = enrollmentRepository;
        _lessonRepository = lessonRepository;
        _progressRepository = progressRepository;
        _certificateRepository = certificateRepository;
        _forumPostRepository = forumPostRepository;
        _forumCommentRepository = forumCommentRepository;
        _forumReactionRepository = forumReactionRepository;
        _submissionRepository = submissionRepository;
        _unitOfWork = unitOfWork;
        _certificateService = certificateService;
        _access = access;
        _db = db;
    }

    public async Task<CourseLearningProgressDto?> GetCourseProgressAsync(int learnerId, int courseId)
    {
        var now = DateTime.UtcNow;
        var enrollment = await _enrollmentRepository.GetQueryable()
            .AsNoTracking()
            .Include(e => e.Course)
            .Include(e => e.LessonProgresses)
            .Where(e =>
                e.LearnerId == learnerId &&
                e.CourseId == courseId &&
                (e.Status == "ACTIVE" || e.Status == "COMPLETED") &&
                (!e.ExpiresAt.HasValue || e.ExpiresAt.Value > now))
            .OrderByDescending(e => e.Status == "ACTIVE")
            .ThenByDescending(e => e.EnrolledAt ?? e.CreatedAt)
            .ThenByDescending(e => e.EnrollmentId)
            .FirstOrDefaultAsync();

        if (enrollment == null)
        {
            return null;
        }

        var lessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == courseId && l.Status == LessonStatus.ACTIVE);

        var lessons = lessonsList
            .OrderBy(l => l.OrderIndex)
            .ToList();

        var totalLessons = lessons.Count;
        var lessonProgressDict = (enrollment.LessonProgresses ?? new List<LessonProgress>())
            .ToDictionary(lp => lp.LessonId);

        var progressDtos = new List<LessonProgressDto>();
        int completedCount = 0;

        foreach (var lesson in lessons)
        {
            if (lessonProgressDict.TryGetValue(lesson.LessonId, out var progress))
            {
                bool isDone = progress.IsCompleted || progress.Status == LessonProgressStatus.COMPLETED;
                if (isDone) completedCount++;

                progressDtos.Add(new LessonProgressDto
                {
                    LessonId = lesson.LessonId,
                    IsCompleted = isDone,
                    LastPositionSeconds = progress.LastPositionSeconds,
                    TimeSpentSeconds = progress.TimeSpentSeconds,
                    TimeSpentMinutes = progress.TimeSpentMinutes,
                    LastAccessedAt = progress.LastAccessedAt,
                    CompletedAt = progress.CompletedAt
                });
            }
            else
            {
                progressDtos.Add(new LessonProgressDto
                {
                    LessonId = lesson.LessonId,
                    IsCompleted = false,
                    LastPositionSeconds = 0,
                    TimeSpentSeconds = 0,
                    TimeSpentMinutes = 0,
                    LastAccessedAt = null,
                    CompletedAt = null
                });
            }
        }

        // Lấy danh sách ModuleId của khóa học để lọc chính xác Chapter Quiz
        var moduleIds = await _db.Modules.AsNoTracking()
            .Where(m => m.CourseId == courseId)
            .Select(m => m.ModuleId)
            .ToListAsync();

        var lessonIds = lessons.Select(l => l.LessonId).ToList();

        // Lấy các bài đánh giá chương (CHAPTER_ASSESSMENT) ACTIVE
        var activeChapterQuizzes = await _db.Quizzes.AsNoTracking()
            .Where(q =>
                q.Purpose == QuizPurpose.CHAPTER_ASSESSMENT &&
                q.Status == QuizStatus.ACTIVE &&
                ((q.CourseId == courseId) || (q.ModuleId.HasValue && moduleIds.Contains(q.ModuleId.Value))))
            .Select(q => q.QuizId)
            .Distinct()
            .ToListAsync();

        // Lấy bài Quiz tổng kết cuối khóa (FINAL_ASSESSMENT) ACTIVE
        var activeFinalQuizzes = await _db.Quizzes.AsNoTracking()
            .Where(q =>
                q.Purpose == QuizPurpose.FINAL_ASSESSMENT &&
                q.Status == QuizStatus.ACTIVE &&
                (q.CourseId == courseId || (q.LessonId.HasValue && lessonIds.Contains(q.LessonId.Value))))
            .Select(q => q.QuizId)
            .Distinct()
            .ToListAsync();

        // Lấy danh sách các QuizId mà học viên đã làm và ĐẠT (PASSED)
        var requiredQuizIds = activeChapterQuizzes.Concat(activeFinalQuizzes).Distinct().ToList();
        var passedQuizIds = requiredQuizIds.Count == 0
            ? new HashSet<int>()
            : (await _db.QuizAttempts.AsNoTracking()
                .Where(a =>
                    a.UserId == learnerId &&
                    requiredQuizIds.Contains(a.QuizId) &&
                    a.ResultStatus == QuizAttemptStatus.PASSED)
                .Select(a => a.QuizId)
                .Distinct()
                .ToListAsync()).ToHashSet();

        int passedChapterCount = activeChapterQuizzes.Count(id => passedQuizIds.Contains(id));
        int passedFinalCount = activeFinalQuizzes.Count(id => passedQuizIds.Contains(id));

        // Lấy các bài tập nói độc lập (Scope CHAPTER hoặc FINAL) chưa gắn vào Lesson
        var standaloneSpeakingScripts = await _db.SpeakingScripts.AsNoTracking()
            .Where(s => s.CourseId == courseId && s.LessonId == null)
            .Select(s => s.ScriptId)
            .Distinct()
            .ToListAsync();

        var passedSpeakingIds = standaloneSpeakingScripts.Count == 0
            ? new HashSet<int>()
            : (await _db.SpeakingSubmissions.AsNoTracking()
                .Where(s => s.LearnerId == learnerId && s.ScriptId.HasValue && standaloneSpeakingScripts.Contains(s.ScriptId.Value) && s.Score.HasValue && s.Score.Value >= 80)
                .Select(s => s.ScriptId!.Value)
                .Distinct()
                .ToListAsync()).ToHashSet();

        int passedSpeakingCount = standaloneSpeakingScripts.Count(id => passedSpeakingIds.Contains(id));

        // Tổng số đầu mục bắt buộc = số bài học ACTIVE + số Chapter Quiz ACTIVE + số Final Quiz ACTIVE + số bài nói độc lập
        int totalRequiredItems = totalLessons + activeChapterQuizzes.Count + activeFinalQuizzes.Count + standaloneSpeakingScripts.Count;
        int completedRequiredItems = completedCount + passedChapterCount + passedFinalCount + passedSpeakingCount;

        decimal completionPercentage = totalRequiredItems > 0
            ? Math.Round((decimal)completedRequiredItems / totalRequiredItems * 100, 2)
            : 0m;

        // Thẩm định điều kiện nhận chứng chỉ từ LearningAccessService (yêu cầu PASS cả bài thi cuối khóa)
        var certAccess = await _access.CheckCertificateAsync(learnerId, courseId);

        // Check if certificate exists
        var certs = await _certificateRepository.FindAsync(
            c => c.EnrollmentId == enrollment.EnrollmentId);

        var certificate = certs.FirstOrDefault();

        bool isCompleted = (completionPercentage >= 100.00m && certAccess.Allowed) || certificate != null;

        // Đồng bộ CompletionPercentage vào Enrollment nếu có thay đổi
        if (enrollment.CompletionPercentage != completionPercentage)
        {
            var trackedEnrollment = await _enrollmentRepository.GetByIdAsync(enrollment.EnrollmentId);
            if (trackedEnrollment != null)
            {
                trackedEnrollment.CompletionPercentage = completionPercentage;
                trackedEnrollment.UpdatedAt = DateTime.UtcNow;
                _enrollmentRepository.Update(trackedEnrollment);
                await _unitOfWork.SaveChangesAsync();
            }
        }

        return new CourseLearningProgressDto
        {
            CourseId = courseId,
            CourseTitle = enrollment.Course?.Title ?? string.Empty,
            EnrollmentId = enrollment.EnrollmentId,
            CompletionPercentage = completionPercentage,
            IsCompleted = isCompleted,
            CompletedLessonsCount = completedCount,
            TotalLessonsCount = totalLessons,
            CertificateId = certificate?.CertificateId,
            CertificateCode = certificate?.CertificateCode,
            LessonProgresses = progressDtos
        };
    }

    public async Task<CourseLearningProgressDto?> UpdateLessonProgressAsync(
        int learnerId, int lessonId, UpdateLessonProgressRequest request)
    {
        var lesson = await _lessonRepository.GetByIdAsync(lessonId);
        if (lesson == null) return null;

        var now = DateTime.UtcNow;
        var enrollment = await _enrollmentRepository.GetQueryable()
            .Include(e => e.LessonProgresses)
            .Where(e =>
                e.LearnerId == learnerId &&
                e.CourseId == lesson.CourseId &&
                (e.Status == "ACTIVE" || e.Status == "COMPLETED") &&
                (!e.ExpiresAt.HasValue || e.ExpiresAt.Value > now))
            .OrderByDescending(e => e.Status == "ACTIVE")
            .ThenByDescending(e => e.EnrolledAt ?? e.CreatedAt)
            .ThenByDescending(e => e.EnrollmentId)
            .FirstOrDefaultAsync();

        if (enrollment == null) return null;
        var decision = await _access.CheckLessonAsync(learnerId, lessonId);
        if (!decision.Allowed) throw new InvalidOperationException(decision.Reason ?? "Lesson locked.");

        var existingProgresses = await _progressRepository.FindAsync(
            lp => lp.EnrollmentId == enrollment.EnrollmentId && lp.LessonId == lessonId);
        var progress = existingProgresses.FirstOrDefault();

        bool isNew = false;
        if (progress == null)
        {
            isNew = true;
            progress = new LessonProgress
            {
                EnrollmentId = enrollment.EnrollmentId,
                LessonId = lessonId,
                Status = LessonProgressStatus.NOT_STARTED,
                IsCompleted = false,
                LastPositionSeconds = 0,
                TimeSpentSeconds = 0,
                TimeSpentMinutes = 0,
                LastAccessedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _progressRepository.AddAsync(progress);
        }

        if (request.IsCompleted.HasValue)
        {
            progress.IsCompleted = request.IsCompleted.Value;
            if (request.IsCompleted.Value)
            {
                progress.Status = LessonProgressStatus.COMPLETED;
                progress.CompletedAt ??= DateTime.UtcNow;
            }
            else
            {
                progress.Status = LessonProgressStatus.IN_PROGRESS;
                progress.CompletedAt = null;
            }
        }

        if (request.LastPositionSeconds.HasValue)
        {
            progress.LastPositionSeconds = Math.Max(0, request.LastPositionSeconds.Value);
        }

        if (request.TimeSpentSeconds.HasValue)
        {
            progress.TimeSpentSeconds = Math.Max(progress.TimeSpentSeconds, request.TimeSpentSeconds.Value);
            progress.TimeSpentMinutes = progress.TimeSpentSeconds / 60;
        }

        progress.LastAccessedAt = DateTime.UtcNow;
        progress.UpdatedAt = DateTime.UtcNow;

        // EF Core tracks this entity so we don't need to call Update() explicitly

        try
        {
            await _unitOfWork.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Suppress duplicate key error from concurrent requests
        }

        // Calculate new course completion rate
        var allLessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == lesson.CourseId && l.Status == LessonStatus.ACTIVE);

        var allLessonIds = allLessonsList.Select(l => l.LessonId).ToList();

        var completedProgresses = await _progressRepository.FindAsync(
            lp => lp.EnrollmentId == enrollment.EnrollmentId &&
                 allLessonIds.Contains(lp.LessonId) &&
                 (lp.IsCompleted || lp.Status == LessonProgressStatus.COMPLETED));

        int completedCount = completedProgresses.Count();
        int totalLessons = allLessonIds.Count;

        // Quizzes
        var moduleIds = await _db.Modules.AsNoTracking()
            .Where(m => m.CourseId == lesson.CourseId)
            .Select(m => m.ModuleId)
            .ToListAsync();

        var activeChapterQuizzes = await _db.Quizzes.AsNoTracking()
            .Where(q =>
                q.Purpose == QuizPurpose.CHAPTER_ASSESSMENT &&
                q.Status == QuizStatus.ACTIVE &&
                ((q.CourseId == lesson.CourseId) || (q.ModuleId.HasValue && moduleIds.Contains(q.ModuleId.Value))))
            .Select(q => q.QuizId)
            .Distinct()
            .ToListAsync();

        var activeFinalQuizzes = await _db.Quizzes.AsNoTracking()
            .Where(q =>
                q.Purpose == QuizPurpose.FINAL_ASSESSMENT &&
                q.Status == QuizStatus.ACTIVE &&
                (q.CourseId == lesson.CourseId || (q.LessonId.HasValue && allLessonIds.Contains(q.LessonId.Value))))
            .Select(q => q.QuizId)
            .Distinct()
            .ToListAsync();

        var requiredQuizIds = activeChapterQuizzes.Concat(activeFinalQuizzes).Distinct().ToList();
        var passedQuizIds = requiredQuizIds.Count == 0
            ? new HashSet<int>()
            : (await _db.QuizAttempts.AsNoTracking()
                .Where(a =>
                    a.UserId == learnerId &&
                    requiredQuizIds.Contains(a.QuizId) &&
                    a.ResultStatus == QuizAttemptStatus.PASSED)
                .Select(a => a.QuizId)
                .Distinct()
                .ToListAsync()).ToHashSet();

        int passedChapterCount = activeChapterQuizzes.Count(id => passedQuizIds.Contains(id));
        int passedFinalCount = activeFinalQuizzes.Count(id => passedQuizIds.Contains(id));

        var standaloneSpeakingScripts = await _db.SpeakingScripts.AsNoTracking()
            .Where(s => s.CourseId == lesson.CourseId && s.LessonId == null)
            .Select(s => s.ScriptId)
            .Distinct()
            .ToListAsync();

        var passedSpeakingIds = standaloneSpeakingScripts.Count == 0
            ? new HashSet<int>()
            : (await _db.SpeakingSubmissions.AsNoTracking()
                .Where(s => s.LearnerId == learnerId && s.ScriptId.HasValue && standaloneSpeakingScripts.Contains(s.ScriptId.Value) && s.Score.HasValue && s.Score.Value >= 80)
                .Select(s => s.ScriptId!.Value)
                .Distinct()
                .ToListAsync()).ToHashSet();

        int passedSpeakingCount = standaloneSpeakingScripts.Count(id => passedSpeakingIds.Contains(id));

        int totalRequiredItems = totalLessons + activeChapterQuizzes.Count + activeFinalQuizzes.Count + standaloneSpeakingScripts.Count;
        int completedRequiredItems = completedCount + passedChapterCount + passedFinalCount + passedSpeakingCount;

        decimal newPercentage = totalRequiredItems > 0
            ? Math.Round((decimal)completedRequiredItems / totalRequiredItems * 100, 2)
            : 0m;

        enrollment.CompletionPercentage = newPercentage;
        enrollment.UpdatedAt = DateTime.UtcNow;

        // EF Core tracks this entity so we don't need to call Update() explicitly
        await _unitOfWork.SaveChangesAsync();

        // Auto-issue certificate ONLY if 100% completed AND CheckCertificateAsync is Allowed
        if (newPercentage >= 100.00m)
        {
            var certAccess = await _access.CheckCertificateAsync(learnerId, lesson.CourseId);
            if (certAccess.Allowed)
            {
                try
                {
                    await _certificateService.IssueCertificateAsync(learnerId, lesson.CourseId);
                }
                catch (Exception)
                {
                    // Suppress if already issued or concurrent
                }
            }
        }

        return await GetCourseProgressAsync(learnerId, lesson.CourseId);
    }
    public async Task<List<ActivityLogDto>> GetRecentActivitiesAsync(int learnerId, int limit = 10)
    {
        var activities = new List<ActivityLogDto>();

        // 1. Get completed lessons
        var completedLessons = await _progressRepository.FindAsync(
            p => p.Enrollment.LearnerId == learnerId && (p.IsCompleted || p.Status == LessonProgressStatus.COMPLETED),
            p => p.Lesson, p => p.Enrollment.Course);
            
        foreach (var progress in completedLessons)
        {
            if (progress.CompletedAt.HasValue)
            {
                activities.Add(new ActivityLogDto
                {
                    Emoji = "✅",
                    Text = $"Completed \"{progress.Lesson?.Title}\" in {progress.Enrollment?.Course?.Title}",
                    CreatedAt = progress.CompletedAt.Value,
                    Accent = "text-blue-600 bg-blue-50",
                    Link = $"/courses/{progress.Enrollment?.CourseId}/learn"
                });
            }
        }

        // 2. Get earned certificates
        var certificates = await _certificateRepository.FindAsync(
            c => c.Enrollment.LearnerId == learnerId,
            c => c.Enrollment.Course);

        foreach (var cert in certificates)
        {
            activities.Add(new ActivityLogDto
            {
                Emoji = "🏆",
                Text = $"Earned {cert.Enrollment?.Course?.Title} Certificate",
                CreatedAt = cert.IssuedAt,
                Accent = "text-amber-600 bg-amber-50",
                Link = "/profile"
            });
        }

        // 3. Get new enrollments
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId,
            e => e.Course);

        foreach (var e in enrollments)
        {
            activities.Add(new ActivityLogDto
            {
                Emoji = "🌟",
                Text = $"Enrolled in {e.Course?.Title}",
                CreatedAt = e.EnrolledAt ?? e.CreatedAt,
                Accent = "text-emerald-600 bg-emerald-50",
                Link = $"/courses/{e.CourseId}/learn"
            });
        }

        // 4. Get forum posts
        var forumPosts = await _forumPostRepository.FindAsync(
            p => p.AuthorId == learnerId);
            
        foreach (var post in forumPosts)
        {
            activities.Add(new ActivityLogDto
            {
                Emoji = "📝",
                Text = $"Posted new discussion: {post.Title}",
                CreatedAt = post.CreatedAt,
                Accent = "text-indigo-600 bg-indigo-50",
                Link = $"/forum/posts/{post.PostId}"
            });
        }

        // 5. Get forum comments
        var forumComments = await _forumCommentRepository.FindAsync(
            c => c.AuthorId == learnerId,
            c => c.Post);
            
        foreach (var comment in forumComments)
        {
            activities.Add(new ActivityLogDto
            {
                Emoji = "💬",
                Text = $"Commented on discussion: {comment.Post?.Title}",
                CreatedAt = comment.CreatedAt,
                Accent = "text-cyan-600 bg-cyan-50",
                Link = $"/forum/posts/{comment.PostId}"
            });
        }

        // 6. Get forum reactions
        var forumReactions = await _forumReactionRepository.FindAsync(
            r => r.UserId == learnerId,
            r => r.Post, r => r.Comment, r => r.Comment!.Post);

        foreach (var reaction in forumReactions)
        {
            var targetTitle = reaction.TargetType == "POST" ? reaction.Post?.Title : "a comment";
            var link = reaction.TargetType == "POST" 
                ? $"/forum/posts/{reaction.PostId}"
                : $"/forum/posts/{reaction.Comment?.PostId}";

            activities.Add(new ActivityLogDto
            {
                Emoji = "👍",
                Text = $"Reacted {reaction.ReactionType.ToLower()} to {targetTitle}",
                CreatedAt = reaction.CreatedAt,
                Accent = "text-pink-600 bg-pink-50",
                Link = link
            });
        }

        // 7. Get speaking submissions
        var speakingSubmissions = await _submissionRepository.FindAsync(
            s => s.LearnerId == learnerId,
            s => s.Lesson);

        foreach (var sub in speakingSubmissions)
        {
            activities.Add(new ActivityLogDto
            {
                Emoji = "🎙️",
                Text = $"Submitted practice for {sub.Lesson?.Title}",
                CreatedAt = sub.SubmittedAt,
                Accent = "text-violet-600 bg-violet-50",
                Link = $"/courses/{sub.Lesson?.CourseId}/learn"
            });
        }

        // Sort by date descending and take top N
        return activities
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => 
            {
                var timeSpan = DateTime.UtcNow - a.CreatedAt;
                if (timeSpan.TotalMinutes < 60)
                    a.Time = $"{(int)timeSpan.TotalMinutes}m ago";
                else if (timeSpan.TotalHours < 24)
                    a.Time = $"{(int)timeSpan.TotalHours}h ago";
                else
                    a.Time = $"{(int)timeSpan.TotalDays}d ago";
                
                return a;
            })
            .ToList();
    }
    public async Task<LearningStreakDto> GetLearningStreakAsync(int learnerId)
    {
        var completedLessons = await _progressRepository.FindAsync(
            p => p.Enrollment.LearnerId == learnerId && (p.CompletedAt.HasValue || p.IsCompleted));

        var dates = completedLessons
            .Select(p => (p.CompletedAt ?? p.UpdatedAt).AddHours(7).Date) // Convert to Vietnam time (UTC+7)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        int currentStreak = 0;
        int longestStreak = 0;
        var todayVn = DateTime.UtcNow.AddHours(7).Date;

        if (dates.Count > 0)
        {
            currentStreak = 1;
            longestStreak = 1;

            for (int i = 1; i < dates.Count; i++)
            {
                if ((dates[i] - dates[i - 1]).TotalDays == 1)
                {
                    currentStreak++;
                }
                else
                {
                    currentStreak = 1; // Reset streak
                }

                if (currentStreak > longestStreak)
                {
                    longestStreak = currentStreak;
                }
            }

            // Check if current streak is still active
            // If the last date they learned is before yesterday, streak is broken.
            if ((todayVn - dates.Last()).TotalDays > 1)
            {
                currentStreak = 0;
            }
        }

        return new LearningStreakDto
        {
            CurrentStreak = currentStreak,
            LongestStreak = longestStreak
        };
    }
}
