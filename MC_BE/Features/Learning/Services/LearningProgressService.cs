
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
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
    private readonly ICourseLearningAccessService _courseAccess;
    private readonly ILearningAccessService _access;
    private readonly SmartMcDbContext _db;
    private readonly IRemedialAssignmentService _remedialAssignments;

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
        ICourseLearningAccessService courseAccess,
        ILearningAccessService access,
        SmartMcDbContext db,
        IRemedialAssignmentService remedialAssignments)
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
        _courseAccess = courseAccess;
        _access = access;
        _db = db;
        _remedialAssignments = remedialAssignments;
    }

        public async Task<CourseLearningProgressDto?> GetCourseProgressAsync(int learnerId, int courseId)
    {

        if (!await _courseAccess.CanAccessCourseAsync(courseId, learnerId, isAdmin: false)) return null;

        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId && e.CourseId == courseId,
            e => e.Course,
            e => e.LessonProgresses);

        var enrollment = enrollments.FirstOrDefault();

        if (enrollment == null)
        {
            return null;
        }

        var lessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == courseId && l.Status == LessonStatus.ACTIVE && !l.IsRemedial);

        var lessons = lessonsList
            .OrderBy(l => l.OrderIndex)
            .ToList();

        var totalLessons = lessons.Count;
        var lessonIds = lessons.Select(l => l.LessonId).ToList();

        var passedSpeakingLessonIds = lessonIds.Count == 0
            ? new HashSet<int>()
            : (await _db.SpeakingSubmissions.AsNoTracking()
                .Where(s => s.LearnerId == learnerId &&
                            s.Status == SpeakingSubmissionStatus.GRADED &&
                            s.Score.HasValue && s.Score.Value >= 80 &&
                            ((s.LessonId.HasValue && lessonIds.Contains(s.LessonId.Value)) ||
                             _db.SpeakingScripts.Any(sc => sc.ScriptId == s.ScriptId && sc.LessonId.HasValue && lessonIds.Contains(sc.LessonId.Value))))
                .Select(s => s.LessonId ?? _db.SpeakingScripts.Where(sc => sc.ScriptId == s.ScriptId).Select(sc => sc.LessonId).FirstOrDefault() ?? 0)
                .Distinct()
                .ToListAsync()).ToHashSet();

        var lessonProgressDict = (enrollment.LessonProgresses ?? new List<LessonProgress>())
            .ToDictionary(lp => lp.LessonId);

        var progressDtos = new List<LessonProgressDto>();
        int completedCount = 0;
        bool hasProgressUpdates = false;

        foreach (var lesson in lessons)
        {
            bool isPassedSpeaking = passedSpeakingLessonIds.Contains(lesson.LessonId);

            if (lessonProgressDict.TryGetValue(lesson.LessonId, out var progress))
            {
                bool isDone = progress.IsCompleted || progress.Status == LessonProgressStatus.COMPLETED || isPassedSpeaking;
                if (isDone) completedCount++;

                if (isPassedSpeaking && (!progress.IsCompleted || progress.Status != LessonProgressStatus.COMPLETED))
                {
                    progress.IsCompleted = true;
                    progress.Status = LessonProgressStatus.COMPLETED;
                    progress.CompletedAt ??= DateTime.UtcNow;
                    progress.UpdatedAt = DateTime.UtcNow;
                    _progressRepository.Update(progress);
                    hasProgressUpdates = true;
                }

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
                bool isDone = isPassedSpeaking;
                if (isDone) completedCount++;

                if (isPassedSpeaking)
                {
                    var newProgress = new LessonProgress
                    {
                        EnrollmentId = enrollment.EnrollmentId,
                        LessonId = lesson.LessonId,
                        IsCompleted = true,
                        Status = LessonProgressStatus.COMPLETED,
                        LastPositionSeconds = 0,
                        TimeSpentSeconds = 0,
                        TimeSpentMinutes = 0,
                        LastAccessedAt = DateTime.UtcNow,
                        CompletedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    await _progressRepository.AddAsync(newProgress);
                    hasProgressUpdates = true;
                }

                progressDtos.Add(new LessonProgressDto
                {
                    LessonId = lesson.LessonId,
                    IsCompleted = isDone,
                    LastPositionSeconds = 0,
                    TimeSpentSeconds = 0,
                    TimeSpentMinutes = 0,
                    LastAccessedAt = null,
                    CompletedAt = isDone ? DateTime.UtcNow : null
                });
            }
        }

        if (hasProgressUpdates)
        {
            await _unitOfWork.SaveChangesAsync();
        }

        var moduleIds = await _db.Modules.AsNoTracking()
            .Where(m => m.CourseId == courseId)
            .Select(m => m.ModuleId)
            .ToListAsync();

        var activeChapterQuizzes = await _db.Quizzes.AsNoTracking()
            .Where(q =>
                q.Purpose == QuizPurpose.CHAPTER_ASSESSMENT &&
                !q.IsRemedial &&
                (q.Status == QuizStatus.ACTIVE || (q.Status == QuizStatus.INACTIVE && q.AvailableUntil.HasValue && q.AvailableUntil.Value <= DateTime.UtcNow)) &&
                ((q.CourseId == courseId) || (q.ModuleId.HasValue && moduleIds.Contains(q.ModuleId.Value))))
            .Select(q => q.QuizId)
            .Distinct()
            .ToListAsync();

        var activeFinalQuizzes = await _db.Quizzes.AsNoTracking()
            .Where(q =>
                q.Purpose == QuizPurpose.FINAL_ASSESSMENT &&
                !q.IsRemedial &&
                (q.Status == QuizStatus.ACTIVE || (q.Status == QuizStatus.INACTIVE && q.AvailableUntil.HasValue && q.AvailableUntil.Value <= DateTime.UtcNow)) &&
                (q.CourseId == courseId || (q.LessonId.HasValue && lessonIds.Contains(q.LessonId.Value))))
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
            .Where(s => s.CourseId == courseId && s.LessonId == null && !s.IsRemedial)
            .Select(s => s.ScriptId)
            .Distinct()
            .ToListAsync();

        var passedSpeakingIds = standaloneSpeakingScripts.Count == 0
            ? new HashSet<int>()
            : (await _db.SpeakingSubmissions.AsNoTracking()
                .Where(s => s.LearnerId == learnerId && s.ScriptId.HasValue && standaloneSpeakingScripts.Contains(s.ScriptId.Value) && s.Status == SpeakingSubmissionStatus.GRADED && s.Score.HasValue && s.Score.Value >= 80)
                .Select(s => s.ScriptId!.Value)
                .Distinct()
                .ToListAsync()).ToHashSet();

        int passedSpeakingCount = standaloneSpeakingScripts.Count(id => passedSpeakingIds.Contains(id));

        int totalRequiredItems = totalLessons + activeChapterQuizzes.Count + activeFinalQuizzes.Count + standaloneSpeakingScripts.Count;
        int completedRequiredItems = completedCount + passedChapterCount + passedFinalCount + passedSpeakingCount;

        decimal completionPercentage = totalRequiredItems > 0
            ? Math.Round((decimal)completedRequiredItems / totalRequiredItems * 100, 2)
            : 0m;

        var certAccess = await _access.CheckCertificateAsync(learnerId, courseId);

        var certs = await _certificateRepository.FindAsync(
            c => c.EnrollmentId == enrollment.EnrollmentId);

        var certificate = certs.FirstOrDefault();

        bool isCompleted = (completionPercentage >= 100.00m && certAccess.Allowed) || certificate != null;

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
        if (!await _courseAccess.CanAccessCourseAsync(lesson.CourseId, learnerId, isAdmin: false)) return null;
        if (lesson.IsRemedial && !await _remedialAssignments.CanAccessContentAsync(learnerId, "LESSON", lessonId)) return null;

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

        try
        {
            await _unitOfWork.SaveChangesAsync();
            if (lesson.IsRemedial && request.IsCompleted == true)
                await _remedialAssignments.CompleteLessonAsync(learnerId, lessonId);
        }
        catch (DbUpdateException)
        {
             throw;
        }

        var allLessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == lesson.CourseId && l.Status == LessonStatus.ACTIVE && !l.IsRemedial);

        var allLessonIds = allLessonsList.Select(l => l.LessonId).ToList();

        var completedProgresses = await _progressRepository.FindAsync(
            lp => lp.EnrollmentId == enrollment.EnrollmentId &&
                 allLessonIds.Contains(lp.LessonId) &&
                 (lp.IsCompleted || lp.Status == LessonProgressStatus.COMPLETED));

        int completedCount = completedProgresses.Count();
        int totalLessons = allLessonIds.Count;

        var moduleIds = await _db.Modules.AsNoTracking()
            .Where(m => m.CourseId == lesson.CourseId)
            .Select(m => m.ModuleId)
            .ToListAsync();

        var activeChapterQuizzes = await _db.Quizzes.AsNoTracking()
            .Where(q =>
                q.Purpose == QuizPurpose.CHAPTER_ASSESSMENT &&
                !q.IsRemedial &&
                (q.Status == QuizStatus.ACTIVE || (q.Status == QuizStatus.INACTIVE && q.AvailableUntil.HasValue && q.AvailableUntil.Value <= DateTime.UtcNow)) &&
                ((q.CourseId == lesson.CourseId) || (q.ModuleId.HasValue && moduleIds.Contains(q.ModuleId.Value))))
            .Select(q => q.QuizId)
            .Distinct()
            .ToListAsync();

        var activeFinalQuizzes = await _db.Quizzes.AsNoTracking()
            .Where(q =>
                q.Purpose == QuizPurpose.FINAL_ASSESSMENT &&
                !q.IsRemedial &&
                (q.Status == QuizStatus.ACTIVE || (q.Status == QuizStatus.INACTIVE && q.AvailableUntil.HasValue && q.AvailableUntil.Value <= DateTime.UtcNow)) &&
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
            .Where(s => s.CourseId == lesson.CourseId && s.LessonId == null && !s.IsRemedial)
            .Select(s => s.ScriptId)
            .Distinct()
            .ToListAsync();

        var passedSpeakingIds = standaloneSpeakingScripts.Count == 0
            ? new HashSet<int>()
            : (await _db.SpeakingSubmissions.AsNoTracking()
                .Where(s => s.LearnerId == learnerId && s.ScriptId.HasValue && standaloneSpeakingScripts.Contains(s.ScriptId.Value) && s.Status == SpeakingSubmissionStatus.GRADED && s.Score.HasValue && s.Score.Value >= 80)
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

        await _unitOfWork.SaveChangesAsync();

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

                }
            }
        }

        return await GetCourseProgressAsync(learnerId, lesson.CourseId);
    }

    public async Task<List<ActivityLogDto>> GetRecentActivitiesAsync(int learnerId, int limit = 10)
    {
        var activities = new List<ActivityLogDto>();

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

        var forumComments = await _forumCommentRepository.FindAsync(
            c => c.AuthorId == learnerId,
            c => c.Post);

        foreach (var comment in forumComments)
        {
            activities.Add(new ActivityLogDto
            {
                Emoji = "💬",
                Text = comment.PostId.HasValue
                    ? $"Commented on discussion: {comment.Post?.Title}"
                    : "Commented on lesson discussion",
                CreatedAt = comment.CreatedAt,
                Accent = "text-cyan-600 bg-cyan-50",
                Link = comment.PostId.HasValue
                    ? $"/forum/posts/{comment.PostId.Value}"
                    : (comment.LessonId.HasValue ? $"/lessons/{comment.LessonId.Value}" : "/forum")
            });
        }

        var forumReactions = await _forumReactionRepository.FindAsync(
            r => r.UserId == learnerId,
            r => r.Post, r => r.Comment, r => r.Comment!.Post);

        foreach (var reaction in forumReactions)
        {
            var targetTitle = reaction.TargetType == "POST" ? reaction.Post?.Title : "a comment";
            var link = reaction.TargetType == "POST"
                ? $"/forum/posts/{reaction.PostId}"
                : (reaction.Comment?.PostId.HasValue == true
                    ? $"/forum/posts/{reaction.Comment.PostId.Value}"
                    : (reaction.Comment?.LessonId.HasValue == true
                        ? $"/lessons/{reaction.Comment.LessonId.Value}"
                        : "/forum"));

            activities.Add(new ActivityLogDto
            {
                Emoji = "👍",
                Text = $"Reacted {reaction.ReactionType.ToLower()} to {targetTitle}",
                CreatedAt = reaction.CreatedAt,
                Accent = "text-pink-600 bg-pink-50",
                Link = link
            });
        }

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
            .Select(p => (p.CompletedAt ?? p.UpdatedAt).AddHours(7).Date)
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
                    currentStreak = 1;
                }

                if (currentStreak > longestStreak)
                {
                    longestStreak = currentStreak;
                }
            }

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

    private static readonly List<SubmissionCriterionScoreDto> DefaultRubricCriteriaList = new()
    {
        new SubmissionCriterionScoreDto { Code = "C01", Name = "Phát âm & thanh điệu", WeightPercentage = 18m },
        new SubmissionCriterionScoreDto { Code = "C02", Name = "Độ rõ lời", WeightPercentage = 10m },
        new SubmissionCriterionScoreDto { Code = "C03", Name = "Độ chính xác nội dung", WeightPercentage = 7m },
    };

    public async Task<CourseCompletionSummaryDto?> GetCourseCompletionSummaryAsync(int learnerId, int courseId)
    {
        // 1. Kiểm tra enrollment & quyền truy cập
        var enrollment = await _db.Enrollments.AsNoTracking()
            .Include(e => e.Course)
            .Where(e => e.LearnerId == learnerId && e.CourseId == courseId && e.Status != "PENDING_PAYMENT")
            .OrderByDescending(e => e.Status == "ACTIVE")
            .ThenByDescending(e => e.EnrolledAt ?? e.CreatedAt)
            .ThenByDescending(e => e.EnrollmentId)
            .FirstOrDefaultAsync();

        if (enrollment == null)
        {
            return null; // Không có thông tin ghi danh hợp lệ
        }

        // 2. Kiểm tra tiến độ hoàn thành dựa theo logic progress và cấp chứng chỉ hiện tại
        var progress = await GetCourseProgressAsync(learnerId, courseId);
        var currentProgress = progress?.CompletionPercentage ?? enrollment.CompletionPercentage;

        // Lấy chứng chỉ của khóa học nếu đã được cấp
        var certificate = await _db.Certificates.AsNoTracking()
            .Where(c => c.EnrollmentId == enrollment.EnrollmentId && c.Status == "ACTIVE")
            .OrderByDescending(c => c.IssuedAt)
            .FirstOrDefaultAsync();

        bool isUnlocked = (progress != null && progress.IsCompleted) ||
                          certificate != null ||
                          currentProgress >= 100.00m;

        if (!isUnlocked)
        {
            return new CourseCompletionSummaryDto
            {
                IsUnlocked = false,
                CurrentProgress = currentProgress,
                Message = "Hoàn thành 100% khóa học để mở khóa Báo cáo tổng kết hành trình"
            };
        }

        // 3. Khóa học đã mở khóa -> Tổng hợp dữ liệu bằng truy vấn tối ưu (.AsNoTracking)
        // 3.1. Remedial assignments học viên từng nhận trong khóa
        var remedialRecipients = await _db.RemedialAssignmentRecipients.AsNoTracking()
            .Include(r => r.Assignment)
            .Where(r => r.StudentId == learnerId && r.Assignment.CourseId == courseId)
            .ToListAsync();

        int remedialCount = remedialRecipients.Count;
        int passedRemedialCount = remedialRecipients.Count(r => r.Status == "COMPLETED" || r.CompletedAt != null);

        // 3.2. Toàn bộ bài nộp Speaking của học viên trong khóa (tối ưu nạp kèm Script, Lesson, RubricCriteria)
        var submissions = await _db.SpeakingSubmissions.AsNoTracking()
            .Include(s => s.Lesson)
            .Include(s => s.SpeakingScript!)
                .ThenInclude(sc => sc.RubricCriteria)
            .Where(s => s.LearnerId == learnerId &&
                ((s.Lesson != null && s.Lesson.CourseId == courseId) ||
                 (s.SpeakingScript != null && s.SpeakingScript.CourseId == courseId)))
            .OrderBy(s => s.SubmittedAt)
            .ToListAsync();

        // Xử lý và chuẩn hóa feedback, rubric scores cho từng submission
        var parsedSubmissions = submissions.Select(s =>
        {
            var script = s.SpeakingScript ?? s.Lesson?.SpeakingScript;
            var lesson = s.Lesson;
            var title = !string.IsNullOrWhiteSpace(script?.Title)
                ? script.Title
                : (!string.IsNullOrWhiteSpace(lesson?.Title) ? lesson.Title : "Bài luyện nói");

            var scope = (script?.Scope ?? (lesson != null ? SpeakingScope.LESSON : SpeakingScope.FINAL)).ToString();
            bool isRemedial = (script?.IsRemedial ?? false) || (lesson?.IsRemedial ?? false);

            string? cleanFeedback = s.Feedback;
            List<SubmissionCriterionScoreDto> criterionScores = new();

            if (!string.IsNullOrWhiteSpace(s.Feedback))
            {
                var match = Regex.Match(s.Feedback, @"<!--RUBRIC_SCORES:(.*?)-->", RegexOptions.Singleline);
                if (match.Success)
                {
                    try
                    {
                        var json = match.Groups[1].Value;
                        var parsed = JsonSerializer.Deserialize<List<SubmissionCriterionScoreDto>>(json,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (parsed != null && parsed.Count > 0)
                        {
                            criterionScores = parsed;
                        }
                    }
                    catch { }

                    cleanFeedback = s.Feedback.Replace(match.Value, "").Trim();
                }
                else
                {
                    cleanFeedback = s.Feedback.Trim();
                }
            }

            if (string.IsNullOrEmpty(cleanFeedback)) cleanFeedback = null;

            if (criterionScores.Count == 0 && s.Score.HasValue)
            {
                var criteria = (script?.RubricCriteria != null && script.RubricCriteria.Count > 0)
                    ? script.RubricCriteria.Select(r => new SubmissionCriterionScoreDto
                    {
                        Code = r.Code,
                        Name = r.Name,
                        WeightPercentage = r.WeightPercentage,
                        Score = s.Score.Value,
                        Feedback = null
                    }).ToList()
                    : DefaultRubricCriteriaList.Select(r => new SubmissionCriterionScoreDto
                    {
                        Code = r.Code,
                        Name = r.Name,
                        WeightPercentage = r.WeightPercentage,
                        Score = s.Score.Value,
                        Feedback = null
                    }).ToList();

                criterionScores = criteria;
            }

            bool isGraded = s.Score.HasValue && (s.Status == SpeakingSubmissionStatus.GRADED || s.Status == SpeakingSubmissionStatus.NEEDS_RESUBMISSION || s.Score.Value > 0);

            return new
            {
                Submission = s,
                Title = title,
                Scope = scope,
                IsRemedial = isRemedial,
                CleanFeedback = cleanFeedback,
                CriterionScores = criterionScores,
                IsGraded = isGraded
            };
        }).ToList();

        // Trường hợp bổ sung: nếu recipient không có bản ghi nhưng submission mang cờ remedial
        if (remedialCount == 0)
        {
            var remedialSubs = parsedSubmissions.Where(x => x.IsRemedial).ToList();
            if (remedialSubs.Count > 0)
            {
                remedialCount = remedialSubs.Count;
                passedRemedialCount = remedialSubs.Count(x => x.Submission.Score.HasValue && x.Submission.Score.Value >= 80);
            }
        }

        // Danh sách các bài Speaking đã được chấm điểm (sắp xếp theo SubmittedAt tăng dần)
        var gradedList = parsedSubmissions.Where(x => x.IsGraded).OrderBy(x => x.Submission.SubmittedAt).ToList();

        // 1. Overview
        double finalScore = gradedList.Count > 0
            ? Math.Round((double)gradedList.Average(x => x.Submission.Score!.Value), 1)
            : 0.0;

        DateTime? completedAt = certificate?.IssuedAt ?? enrollment.UpdatedAt;

        string journeySummaryText = remedialCount > 0
            ? $"Bạn từng nhận {remedialCount} bài tập bổ trợ để khắc phục điểm yếu, nhưng đã hoàn thành xuất sắc để đạt trạng thái An toàn với điểm tổng kết {finalScore}/100."
            : "Phong độ ổn định: Bạn đã duy trì trạng thái An toàn (Xanh) xuyên suốt 100% lộ trình khóa học.";

        var overview = new CourseCompletionOverviewDto
        {
            CourseId = courseId,
            CourseTitle = enrollment.Course?.Title ?? progress?.CourseTitle ?? string.Empty,
            CompletedAt = completedAt,
            FinalScore = finalScore,
            CertificateId = certificate?.CertificateId,
            CertificateUrl = certificate?.CertificateUrl,
            RemedialCount = remedialCount,
            PassedRemedialCount = passedRemedialCount,
            JourneySummaryText = journeySummaryText
        };

        // 2. BeforeAfterComparison
        BeforeAfterComparisonDto? beforeAfterComparison = null;
        var comparisonCandidates = gradedList.Where(x => !x.IsRemedial).ToList();
        if (comparisonCandidates.Count == 0)
        {
            comparisonCandidates = gradedList;
        }

        if (comparisonCandidates.Count > 0)
        {
            var initial = comparisonCandidates.First();
            var final = comparisonCandidates.LastOrDefault(x => x.Scope == "FINAL") ?? comparisonCandidates.Last();

            beforeAfterComparison = new BeforeAfterComparisonDto
            {
                InitialSubmission = new SubmissionComparisonItemDto
                {
                    SubmissionId = initial.Submission.SubmissionId,
                    AssignmentTitle = initial.Title,
                    Scope = initial.Scope,
                    SubmittedAt = initial.Submission.SubmittedAt,
                    AudioUrl = initial.Submission.AudioUrl,
                    Score = (double)initial.Submission.Score!.Value,
                    InstructorFeedback = initial.CleanFeedback ?? string.Empty
                },
                FinalSubmission = new SubmissionComparisonItemDto
                {
                    SubmissionId = final.Submission.SubmissionId,
                    AssignmentTitle = final.Title,
                    Scope = final.Scope,
                    SubmittedAt = final.Submission.SubmittedAt,
                    AudioUrl = final.Submission.AudioUrl,
                    Score = (double)final.Submission.Score!.Value,
                    InstructorFeedback = final.CleanFeedback ?? string.Empty
                }
            };
        }

        // 3. GrowthMetrics
        var scoreTimeline = gradedList.Select(x => new ScoreTimelineItemDto
        {
            SubmissionId = x.Submission.SubmissionId,
            Title = x.Title,
            Scope = x.Scope,
            IsRemedial = x.IsRemedial,
            Score = (double)x.Submission.Score!.Value,
            SubmittedAt = x.Submission.SubmittedAt
        }).ToList();

        // Logic RubricBreakdown: Gom nhóm theo tên tiêu chí Rubric (hoặc Code nếu không có tên).
        // So sánh điểm của từng tiêu chí Rubric giữa lần chấm đầu tiên xuất hiện tiêu chí (initialScore)
        // và lần chấm cuối cùng xuất hiện tiêu chí (finalScore); thang điểm tối đa chuẩn hóa là 100 (maxScore = 100).
        // improvementDelta = finalScore - initialScore.
        var criterionScoresMap = new Dictionary<string, List<double>>();
        foreach (var item in gradedList)
        {
            foreach (var crit in item.CriterionScores)
            {
                var criterionName = !string.IsNullOrWhiteSpace(crit.Name) ? crit.Name.Trim() : crit.Code.Trim();
                if (string.IsNullOrEmpty(criterionName)) continue;

                if (!criterionScoresMap.TryGetValue(criterionName, out var scoreList))
                {
                    scoreList = new List<double>();
                    criterionScoresMap[criterionName] = scoreList;
                }
                scoreList.Add((double)crit.Score);
            }
        }

        var rubricBreakdown = criterionScoresMap.Select(kvp =>
        {
            var initialScore = Math.Round(kvp.Value.First(), 1);
            var lastScore = Math.Round(kvp.Value.Last(), 1);
            return new RubricBreakdownItemDto
            {
                CriterionName = kvp.Key,
                InitialScore = initialScore,
                FinalScore = lastScore,
                MaxScore = 100.0,
                ImprovementDelta = Math.Round(lastScore - initialScore, 1)
            };
        }).ToList();

        var growthMetrics = new GrowthMetricsDto
        {
            ScoreTimeline = scoreTimeline,
            RubricBreakdown = rubricBreakdown
        };

        // 4. FeedbackTimeline (danh sách toàn bộ nhận xét của giảng viên, sắp xếp từ đầu khóa đến cuối khóa)
        var feedbackTimeline = parsedSubmissions
            .Where(x => !string.IsNullOrWhiteSpace(x.CleanFeedback))
            .OrderBy(x => x.Submission.GradedAt ?? x.Submission.SubmittedAt)
            .Select(x => new FeedbackTimelineItemDto
            {
                SubmissionId = x.Submission.SubmissionId,
                AssignmentTitle = x.Title,
                IsRemedial = x.IsRemedial,
                Score = x.Submission.Score.HasValue ? (double?)x.Submission.Score.Value : null,
                InstructorFeedback = x.CleanFeedback!,
                GradedAt = x.Submission.GradedAt ?? x.Submission.SubmittedAt
            }).ToList();

        return new CourseCompletionSummaryDto
        {
            IsUnlocked = true,
            CurrentProgress = 100.00m,
            Message = "Báo cáo tổng kết hành trình khóa học",
            Overview = overview,
            BeforeAfterComparison = beforeAfterComparison,
            GrowthMetrics = growthMetrics,
            FeedbackTimeline = feedbackTimeline
        };
    }
}
