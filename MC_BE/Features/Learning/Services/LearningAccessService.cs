using MC_BE.Core.Enums;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Services;

// Chỉ đọc trạng thái học tập và kết quả bài kiểm tra để quyết định quyền truy cập.
public sealed class LearningAccessService : ILearningAccessService
{
    private readonly SmartMcDbContext _db;

    public LearningAccessService(SmartMcDbContext db) => _db = db;

    private sealed record LessonNode(
        int Id,
        int? ModuleId,
        int Order,
        bool Preview,
        bool HasVideo
    );

    private sealed record QuizNode(
        int Id,
        int? LessonId,
        int? ModuleId,
        QuizPurpose Purpose,
        QuizStatus Status,
        DateTime? AvailableUntil
    );

    private sealed record LearningSnapshot(
        List<LessonNode> Lessons,
        List<QuizNode> Quizzes,
        HashSet<int> PassedQuizIds,
        HashSet<int> CompletedLessonIds,
        List<int> Modules
    );

    // PRACTICE cũ và DAILY_PRACTICE đều là bài luyện tập bắt buộc.
    private static bool IsPracticePurpose(QuizPurpose purpose) =>
        purpose == QuizPurpose.PRACTICE ||
        purpose == QuizPurpose.DAILY_PRACTICE;

    private static bool IsRequiredAssessment(QuizNode quiz, DateTime now) =>
        quiz.Status == QuizStatus.ACTIVE ||
        (quiz.Status == QuizStatus.INACTIVE && quiz.AvailableUntil.HasValue && quiz.AvailableUntil.Value <= now);
    // Each published learner Quiz has an individual seven-day deadline.
    // For chapter/final assessments the anchor is the last video in the scope.
    private static bool IsSevenDayQuiz(QuizPurpose purpose, int? lessonId) =>
        purpose == QuizPurpose.PRACTICE ||
        purpose == QuizPurpose.DAILY_PRACTICE ||
        purpose == QuizPurpose.CHAPTER_ASSESSMENT ||
        purpose == QuizPurpose.FINAL_ASSESSMENT;

    private async Task<(bool Allowed, string? Reason)> CheckSevenDayWindowAsync(
        int learnerId, int courseId, QuizPurpose purpose, int? lessonId, int? moduleId, DateTime now)
    {
        if (!IsSevenDayQuiz(purpose, lessonId)) return (true, null);

        int? anchorLessonId = lessonId;
        if (purpose == QuizPurpose.CHAPTER_ASSESSMENT || purpose == QuizPurpose.FINAL_ASSESSMENT)
        {
            if (purpose == QuizPurpose.CHAPTER_ASSESSMENT && !moduleId.HasValue)
                return (false, "Bài đánh giá chương chưa được gắn với chương học.");

            var moduleIds = await _db.Modules.AsNoTracking()
                .Where(m => m.CourseId == courseId)
                .OrderBy(m => m.OrderIndex).ThenBy(m => m.ModuleId)
                .Select(m => m.ModuleId).ToListAsync();

            var videoLessons = await _db.Lessons.AsNoTracking()
                .Where(l => l.CourseId == courseId &&
                    l.Status == LessonStatus.ACTIVE &&
                    l.CourseMaterials.Any(m => m.MaterialType == MaterialType.VIDEO &&
                        ((m.ObjectKey != null && m.ObjectKey != "") ||
                         (m.FileUrl != null && m.FileUrl != ""))))
                .Select(l => new { l.LessonId, l.ModuleId, l.OrderIndex }).ToListAsync();

            if (purpose == QuizPurpose.CHAPTER_ASSESSMENT)
                videoLessons = videoLessons.Where(l => l.ModuleId == moduleId).ToList();

            anchorLessonId = videoLessons
                .OrderBy(l => l.ModuleId.HasValue && moduleIds.Contains(l.ModuleId.Value)
                    ? moduleIds.IndexOf(l.ModuleId.Value) : int.MaxValue)
                .ThenBy(l => l.OrderIndex).ThenBy(l => l.LessonId)
                .Select(l => (int?)l.LessonId).LastOrDefault();
        }

        if (!anchorLessonId.HasValue)
            return (false, "Không tìm thấy video làm mốc mở Quiz.");

        // Use first completion, not a later progress update, to avoid resetting the deadline.
        var completedAt = await _db.LessonProgresses.AsNoTracking()
            .Where(p => p.LessonId == anchorLessonId.Value &&
                p.Enrollment.LearnerId == learnerId &&
                p.Enrollment.CourseId == courseId &&
                p.Enrollment.Status != "PENDING_PAYMENT" &&
                (p.IsCompleted || p.Status == LessonProgressStatus.COMPLETED))
            .OrderBy(p => p.CompletedAt ?? p.UpdatedAt)
            .Select(p => (DateTime?)(p.CompletedAt ?? p.UpdatedAt))
            .FirstOrDefaultAsync();

        if (!completedAt.HasValue)
            return (false, "Vui lòng hoàn thành video trước khi mở Quiz.");
        if (now >= completedAt.Value.AddDays(7))
            return (false, "Quiz đã hết hạn 7 ngày kể từ khi hoàn thành video.");
        return (true, null);
    }

    private async Task<LearningSnapshot> LoadAsync(
        int learnerId,
        int courseId)
    {
        var moduleOrder = await _db.Modules.AsNoTracking()
            .Where(x => x.CourseId == courseId)
            .OrderBy(x => x.OrderIndex)
            .ThenBy(x => x.ModuleId)
            .Select(x => x.ModuleId)
            .ToListAsync();

        var lessons = await _db.Lessons.AsNoTracking()
            .Where(x =>
                x.CourseId == courseId &&
                x.Status == LessonStatus.ACTIVE &&
                !x.IsRemedial)
            .Select(x => new LessonNode(
                x.LessonId,
                x.ModuleId,
                x.OrderIndex,
                x.IsPreview,
                x.CourseMaterials.Any(m =>
                    m.MaterialType == MaterialType.VIDEO &&
                    ((m.ObjectKey != null && m.ObjectKey != "") ||
                     (m.FileUrl != null && m.FileUrl != "")))))
            .ToListAsync();

        var quizzes = await _db.Quizzes.AsNoTracking()
            .Where(x =>
                !x.IsRemedial &&
                (x.CourseId == courseId ||
                 (x.LessonId.HasValue &&
                  _db.Lessons.Any(l =>
                      l.LessonId == x.LessonId &&
                      l.CourseId == courseId)) ||
                 (x.ModuleId.HasValue &&
                  _db.Modules.Any(m =>
                      m.ModuleId == x.ModuleId &&
                      m.CourseId == courseId))))
            .Select(x => new QuizNode(
                x.QuizId,
                x.LessonId,
                x.ModuleId,
                x.Purpose,
                x.Status,
                x.AvailableUntil))
            .ToListAsync();

        var quizIds = quizzes.Select(q => q.Id).ToList();

        var passedQuizIds = quizIds.Count == 0
            ? new HashSet<int>()
            : (await _db.QuizAttempts.AsNoTracking()
                .Where(a =>
                    a.UserId == learnerId &&
                    quizIds.Contains(a.QuizId) &&
                    a.ResultStatus == QuizAttemptStatus.PASSED)
                .Select(a => a.QuizId)
                .Distinct()
                .ToListAsync()).ToHashSet();

        // Lấy các lượt ghi danh hợp lệ của học viên.
        var enrollmentIds = await _db.Enrollments.AsNoTracking()
            .Where(e =>
                e.LearnerId == learnerId &&
                e.CourseId == courseId &&
                e.Status != "PENDING_PAYMENT")
            .Select(e => e.EnrollmentId)
            .ToListAsync();

        var lessonIds = lessons.Select(l => l.Id).ToList();

        // Lấy danh sách bài học đã hoàn thành video.
        var completedLessonIds =
            enrollmentIds.Count == 0 || lessonIds.Count == 0
                ? new HashSet<int>()
                : (await _db.LessonProgresses.AsNoTracking()
                    .Where(p =>
                        enrollmentIds.Contains(p.EnrollmentId) &&
                        lessonIds.Contains(p.LessonId) &&
                        (p.IsCompleted ||
                         p.Status == LessonProgressStatus.COMPLETED))
                    .Select(p => p.LessonId)
                    .Distinct()
                    .ToListAsync()).ToHashSet();

        return new LearningSnapshot(
            lessons,
            quizzes,
            passedQuizIds,
            completedLessonIds,
            moduleOrder
        );
    }

    // Sắp xếp bài học theo thứ tự chương và thứ tự bài.
    private static List<LessonNode> Ordered(
        List<LessonNode> lessons,
        List<int> modules) =>
        lessons
            .OrderBy(l => l.ModuleId.HasValue
                ? (modules.IndexOf(l.ModuleId.Value) < 0
                    ? int.MaxValue - 1
                    : modules.IndexOf(l.ModuleId.Value))
                : int.MaxValue)
            .ThenBy(l => l.Order)
            .ThenBy(l => l.Id)
            .ToList();

    // Lấy tất cả bài tập luyện tập ACTIVE thuộc một bài học.
    private static List<QuizNode> ActivePracticeQuizzesForLesson(
        LearningSnapshot data,
        int lessonId) =>
        data.Quizzes
            .Where(q =>
                IsPracticePurpose(q.Purpose) &&
                q.LessonId == lessonId &&
                (q.Purpose == QuizPurpose.PRACTICE
                    ? IsRequiredAssessment(q, DateTime.UtcNow)
                    : q.Status == QuizStatus.ACTIVE && (!q.AvailableUntil.HasValue || q.AvailableUntil.Value > DateTime.UtcNow)))
            .ToList();

    // Đánh giá chính hết hạn vẫn là điều kiện bắt buộc; grant hợp lệ mới mở lại lượt làm.
    private static bool BlocksLessonProgress(QuizNode quiz, LearningSnapshot data) =>
        !data.PassedQuizIds.Contains(quiz.Id) &&
        IsRequiredAssessment(quiz, DateTime.UtcNow);

    // Bài có video phải hoàn thành video trước khi chuyển bài.
    // Chỉ yêu cầu PASS bài tập khi bài học thực sự được gắn quiz luyện tập ACTIVE.
    // Nếu bài học không có quiz luyện tập thì không phát sinh điều kiện PASS quiz.
    private static string? CheckLessonCompletionAndPractice(
        LessonNode lesson,
        LearningSnapshot data)
    {
        // Chỉ yêu cầu hoàn thành tiến độ nếu bài học thực sự có video.
        // Bài không gắn video vẫn có thể chuyển tiếp, nhưng quiz được gắn
        // với bài đó (nếu có) vẫn phải PASS.
        if (lesson.HasVideo && !data.CompletedLessonIds.Contains(lesson.Id))
        {
            return $"Vui lòng hoàn thành video của bài học {lesson.Id} trước.";
        }

        var practices =
            ActivePracticeQuizzesForLesson(data, lesson.Id);

        if (practices.Any(q => BlocksLessonProgress(q, data)))
        {
            return $"Vui lòng đạt tất cả bài tập luyện tập của bài học {lesson.Id} trước.";
        }

        // Không có bài tập được gắn: không phát sinh điều kiện PASS quiz.
        return null;
    }

    // Kiểm tra điều kiện mở khóa bài học.
    private static string? LessonLock(
        LessonNode target,
        List<LessonNode> ordered,
        LearningSnapshot data)
    {
        var index = ordered.FindIndex(l => l.Id == target.Id);

        if (index < 0)
            return "Bài học không còn hoạt động.";

        // Bài học đầu tiên được mở.
        if (index == 0)
            return null;

        var previous = ordered[index - 1];

        // Phải hoàn thành video và bài tập của bài học trước.
        var previousLessonReason =
            CheckLessonCompletionAndPractice(previous, data);

        if (previousLessonReason != null)
            return previousLessonReason;

        // Khi chuyển sang chương mới:
        // Phải hoàn thành toàn bộ chương trước.
        if (previous.ModuleId.HasValue &&
            previous.ModuleId != target.ModuleId)
        {
            var previousModuleId = previous.ModuleId.Value;

            var previousModuleLessons = ordered
                .Where(x => x.ModuleId == previousModuleId)
                .ToList();

            foreach (var lesson in previousModuleLessons)
            {
                var reason =
                    CheckLessonCompletionAndPractice(lesson, data);

                if (reason != null)
                {
                    return "Vui lòng hoàn thành toàn bộ video và bài tập của chương trước.";
                }
            }

            // Quiz đánh giá đã hết hạn vẫn là cổng bắt buộc cho tới khi học viên đạt.
            var chapterAssessments = data.Quizzes
                .Where(q =>
                    q.Purpose == QuizPurpose.CHAPTER_ASSESSMENT &&
                    q.ModuleId == previousModuleId)
                .Where(q => IsRequiredAssessment(q, DateTime.UtcNow))
                .ToList();

            if (chapterAssessments.Any(q => BlocksLessonProgress(q, data)))
            {
                return "Vui lòng đạt bài đánh giá chương trước.";
            }
        }

        return null;
    }

    // Lấy trạng thái khóa/mở của toàn bộ bài học.
    public async Task<Dictionary<int, string?>> GetLessonLocksAsync(
        int learnerId,
        int courseId)
    {
        var data = await LoadAsync(learnerId, courseId);

        var ordered = Ordered(data.Lessons, data.Modules);

        var result = new Dictionary<int, string?>();

        foreach (var lesson in ordered)
        {
            var lessonIndex =
                ordered.FindIndex(x => x.Id == lesson.Id);

            // Nếu có bài học trước đó đang khóa,
            // các bài học phía sau cũng bị khóa.
            var priorLock = ordered
                .Take(lessonIndex)
                .Select(x => result.GetValueOrDefault(x.Id))
                .FirstOrDefault(reason => reason != null);

            result[lesson.Id] =
                priorLock ?? LessonLock(lesson, ordered, data);
        }

        return result;
    }

    // Kiểm tra quyền truy cập bài học.
    public async Task<(bool Allowed, string? Reason)> CheckLessonAsync(
        int learnerId,
        int lessonId)
    {
        var lesson = await _db.Lessons.AsNoTracking()
            .Where(x => x.LessonId == lessonId)
            .Select(x => new
            { x.CourseId, x.IsRemedial })
            .FirstOrDefaultAsync();

        if (lesson == null)
            return (false, "Không tìm thấy bài học.");

        var enrolled = await _db.Enrollments.AsNoTracking()
            .AnyAsync(e =>
                e.LearnerId == learnerId &&
                e.CourseId == lesson.CourseId &&
                e.Status != "PENDING_PAYMENT");

        if (!enrolled)
            return (false, "Bạn cần đăng ký khóa học để tiếp tục.");

        if (lesson.IsRemedial)
        {
            var assigned = await _db.RemedialAssignmentRecipients.AsNoTracking()
                .AnyAsync(r => r.StudentId == learnerId && r.Assignment.LessonId == lessonId &&
                    r.Assignment.IsActive && r.Status != "REVOKED");
            return assigned ? (true, null) : (false, "Bài bổ trợ chưa được giao cho bạn.");
        }

        var locks = await GetLessonLocksAsync(
            learnerId,
            lesson.CourseId);

        if (!locks.TryGetValue(lessonId, out var reason))
            return (false, "Bài học không còn hoạt động.");

        return (reason == null, reason);
    }

    // Kiểm tra quyền truy cập bài kiểm tra.
    public async Task<(bool Allowed, string? Reason)> CheckQuizAsync(
        int learnerId,
        int quizId)
    {
        var quiz = await _db.Quizzes.AsNoTracking()
            .Where(x => x.QuizId == quizId)
            .Select(x => new
            {
                x.CourseId,
                x.LessonId,
                x.ModuleId,
                x.Purpose,
                x.Status,
                x.AvailableFrom,
                x.AvailableUntil,
                x.IsRemedial
            })
            .FirstOrDefaultAsync();

        if (quiz == null)
        {
            return (false, "Bài kiểm tra hiện không khả dụng.");
        }

        var now = DateTime.UtcNow;

        if (quiz.IsRemedial)
        {
            var remedialAssigned = await _db.RemedialAssignmentRecipients.AsNoTracking()
                .AnyAsync(r => r.StudentId == learnerId && r.Status != "REVOKED" && r.Status != "COMPLETED" &&
                    r.Assignment.QuizId == quizId &&
                    r.Assignment.IsActive &&
                    (r.Assignment.MaxAttempts == 0 || r.AttemptsUsed < r.Assignment.MaxAttempts));
            return quiz.Status == QuizStatus.ACTIVE && remedialAssigned
                ? (true, null)
                : (false, "Bài bổ trợ chưa được giao cho bạn, đã hoàn thành hoặc đã hết lượt.");
        }

        var hasValidRetakeGrant = await _db.RemedialRetakeGrants.AsNoTracking()
            .AnyAsync(g => g.LearnerId == learnerId && g.TargetQuizId == quizId &&
                !g.UsedAt.HasValue && g.AttemptsRemaining > 0 && g.ExpiresAt > now && g.Recipient.Status != "REVOKED" && g.Recipient.Assignment.IsActive);
        var expiredAvailabilityGrant = hasValidRetakeGrant && quiz.AvailableUntil.HasValue && quiz.AvailableUntil.Value <= now;

        if (quiz.Status != QuizStatus.ACTIVE && !expiredAvailabilityGrant)
            return (false, "Bài kiểm tra chưa được xuất bản hoặc đã ngừng hoạt động.");

        if (!IsSevenDayQuiz(quiz.Purpose, quiz.LessonId) &&
            ((quiz.AvailableFrom.HasValue && now < quiz.AvailableFrom.Value) ||
             (!hasValidRetakeGrant && quiz.AvailableUntil.HasValue && now >= quiz.AvailableUntil.Value)))
        {
            return (false, "Bài kiểm tra nằm ngoài thời gian được phép làm.");
        }

        // Xác định khóa học của Quiz.
        var courseId = quiz.CourseId;

        if (!courseId.HasValue && quiz.LessonId.HasValue)
        {
            courseId = await _db.Lessons
                .Where(x => x.LessonId == quiz.LessonId)
                .Select(x => (int?)x.CourseId)
                .FirstOrDefaultAsync();
        }

        if (!courseId.HasValue && quiz.ModuleId.HasValue)
        {
            courseId = await _db.Modules
                .Where(x => x.ModuleId == quiz.ModuleId)
                .Select(x => (int?)x.CourseId)
                .FirstOrDefaultAsync();
        }

        if (!courseId.HasValue)
        {
            return (false, "Bài kiểm tra chưa được gắn với khóa học.");
        }

        var sevenDayWindow = await CheckSevenDayWindowAsync(
            learnerId, courseId.Value, quiz.Purpose, quiz.LessonId, quiz.ModuleId, now);
        if (!sevenDayWindow.Allowed) return sevenDayWindow;

        // Kiểm tra ghi danh.
        var enrolled = await _db.Enrollments.AsNoTracking()
            .AnyAsync(e =>
                e.LearnerId == learnerId &&
                e.CourseId == courseId &&
                e.Status != "PENDING_PAYMENT");

        if (!enrolled)
            return (false, "Bạn cần đăng ký khóa học để tiếp tục.");

        var data = await LoadAsync(learnerId, courseId.Value);

        var ordered = Ordered(data.Lessons, data.Modules);

        var locks = await GetLessonLocksAsync(
            learnerId,
            courseId.Value);

        // ==========================================
        // 1. PRACTICE / DAILY_PRACTICE
        // ==========================================
        if (IsPracticePurpose(quiz.Purpose))
        {
            if (!quiz.LessonId.HasValue)
            {
                return (false, "Bài tập luyện tập phải được gắn với một bài học.");
            }

            if (!locks.TryGetValue(
                    quiz.LessonId.Value,
                    out var lessonLockReason) ||
                lessonLockReason != null)
            {
                return (false,
                    lessonLockReason ?? "Bài học đang bị khóa.");
            }

            var quizLesson = ordered.FirstOrDefault(
                lesson => lesson.Id == quiz.LessonId.Value);

            if (quizLesson == null)
            {
                return (false, "Không tìm thấy bài học được gắn với bài tập.");
            }

            if (quizLesson.HasVideo &&
                !data.CompletedLessonIds.Contains(quiz.LessonId.Value))
            {
                return (false,
                    "Vui lòng hoàn thành video của bài học trước khi làm bài tập.");
            }

            return (true, null);
        }

        // ==========================================
        // 2. CHAPTER ASSESSMENT
        // ==========================================
        if (quiz.Purpose == QuizPurpose.CHAPTER_ASSESSMENT)
        {
            if (!quiz.ModuleId.HasValue)
            {
                return (false,
                    "Bài đánh giá chương chưa được gắn với chương học.");
            }

            // Chỉ lấy bài học thuộc đúng Module của Quiz.
            var chapterLessons = ordered
                .Where(x => x.ModuleId == quiz.ModuleId.Value)
                .ToList();

            if (chapterLessons.Count == 0)
            {
                return (false, "Chương này chưa có bài học.");
            }

            foreach (var lesson in chapterLessons)
            {
                // Bài học phải được mở theo đúng thứ tự.
                if (locks.GetValueOrDefault(lesson.Id) != null)
                {
                    return (false,
                        "Vui lòng hoàn thành các bài học theo đúng thứ tự trước.");
                }

                // Chỉ kiểm tra video nếu bài có video; chỉ PASS các bài tập thực sự được gắn.
                var reason =
                    CheckLessonCompletionAndPractice(lesson, data);

                if (reason != null)
                {
                    return (false,
                        "Vui lòng hoàn thành toàn bộ video và đạt tất cả bài tập hằng ngày trong chương trước.");
                }
            }

            return (true, null);
        }

        // ==========================================
        // 3. FINAL ASSESSMENT
        // ==========================================
        if (quiz.Purpose == QuizPurpose.FINAL_ASSESSMENT)
        {
            return await CheckCourseGatesAsync(
                learnerId,
                courseId.Value,
                requireFinal: false);
        }

        return (false, "Loại bài kiểm tra chưa được hỗ trợ.");
    }

    // Kiểm tra điều kiện hoàn thành toàn khóa học.
    private async Task<(bool Allowed, string? Reason)> CheckCourseGatesAsync(
        int learnerId,
        int courseId,
        bool requireFinal)
    {
        var data = await LoadAsync(learnerId, courseId);

        var ordered = Ordered(data.Lessons, data.Modules);

        if (ordered.Count == 0)
        {
            return (false,
                "Khóa học chưa có bài học đang hoạt động.");
        }

        var locks = await GetLessonLocksAsync(
            learnerId,
            courseId);

        if (locks.Values.Any(reason => reason != null))
        {
            return (false, "Vẫn còn bài học đang bị khóa.");
        }

        // Tất cả video và bài tập của từng bài học phải hoàn thành.
        foreach (var lesson in ordered)
        {
            var reason =
                CheckLessonCompletionAndPractice(lesson, data);

            if (reason != null)
            {
                return (false,
                    "Vui lòng hoàn thành toàn bộ video và PASS các bài tập được gắn trước khi thi cuối khóa.");
            }
        }

        // Tất cả bài đánh giá chương phải đạt.
        foreach (var moduleId in data.Modules
            .Where(id => ordered.Any(l => l.ModuleId == id)))
        {
            var assessments = data.Quizzes
                .Where(q =>
                    q.Purpose == QuizPurpose.CHAPTER_ASSESSMENT &&
                    q.ModuleId == moduleId)
                .Where(q => IsRequiredAssessment(q, DateTime.UtcNow))
                .ToList();

            if (assessments.Count == 0 ||
                assessments.Any(q =>
                    !data.PassedQuizIds.Contains(q.Id)))
            {
                return (false,
                    "Vui lòng đạt tất cả bài đánh giá chương trước khi thi cuối khóa.");
            }
        }

        // Nếu yêu cầu kiểm tra cả bài thi cuối khóa.
        if (requireFinal)
        {
            var finalAssessments = data.Quizzes
                .Where(q =>
                    q.Purpose == QuizPurpose.FINAL_ASSESSMENT &&
                    IsRequiredAssessment(q, DateTime.UtcNow))
                .ToList();

            if (finalAssessments.Count == 0 ||
                finalAssessments.Any(q =>
                    !data.PassedQuizIds.Contains(q.Id)))
            {
                return (false,
                    "Vui lòng đạt bài thi cuối khóa trước.");
            }
        }

        return (true, null);
    }

    // Kiểm tra điều kiện cấp chứng chỉ.
    public async Task<(bool Allowed, string? Reason)> CheckCertificateAsync(
        int learnerId,
        int courseId)
    {
        // Phải hoàn thành toàn bộ khóa và bài thi cuối khóa.
        var gates = await CheckCourseGatesAsync(
            learnerId,
            courseId,
            requireFinal: true);

        if (!gates.Allowed)
            return gates;

        var lessonIds = await _db.Lessons.AsNoTracking()
            .Where(x =>
                x.CourseId == courseId &&
                x.Status == LessonStatus.ACTIVE)
            .Select(x => x.LessonId)
            .ToListAsync();

        var enrollmentIds = await _db.Enrollments.AsNoTracking()
            .Where(e =>
                e.CourseId == courseId &&
                e.LearnerId == learnerId &&
                e.Status != "PENDING_PAYMENT")
            .Select(e => e.EnrollmentId)
            .ToListAsync();

        if (enrollmentIds.Count == 0)
        {
            return (false,
                "Cần có đăng ký khóa học hợp lệ.");
        }

        var completed = await _db.LessonProgresses.AsNoTracking()
            .Where(x =>
                enrollmentIds.Contains(x.EnrollmentId) &&
                lessonIds.Contains(x.LessonId) &&
                (x.IsCompleted ||
                 x.Status == LessonProgressStatus.COMPLETED))
            .Select(x => x.LessonId)
            .Distinct()
            .CountAsync();

        return completed == lessonIds.Count
            ? (true, null)
            : (false,
                "Vui lòng hoàn thành tất cả bài học trước khi nhận chứng chỉ.");
    }
}
