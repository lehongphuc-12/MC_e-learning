
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Services;

/// <summary>
/// Dịch vụ kiểm soát truy cập và điều kiện tiên quyết trong tiến trình học tập.
/// Chỉ đọc trạng thái học tập và kết quả bài kiểm tra để quyết định quyền truy cập.
/// </summary>
public sealed class LearningAccessService : ILearningAccessService
{
    private readonly SmartMcDbContext _db;

    /// <summary>
    /// Khởi tạo dịch vụ với DbContext inject từ DI Container.
    /// </summary>
    public LearningAccessService(SmartMcDbContext db) => _db = db;
    // CÁC CẤU TRÚC DỮ LIỆU NỘI BỘ (IN-MEMORY VALUE OBJECTS / IMMUTABLE RECORDS):
    // [TẠI SAO DÙNG private sealed record]:
    //   - Tối ưu hóa bộ nhớ RAM: Record là bất biến (immutable), kích thước nhẹ, chỉ lưu đúng các trường
    //     cần thiết để tính toán logic khóa bài mà không giữ lại toàn bộ Entity EF Core nặng nề.

    /// <summary>
    /// Node đại diện cho một bài học trong cây tiến trình học tập.
    /// </summary>
    private sealed record LessonNode(
        int Id,
        int? ModuleId,
        int Order,
        bool Preview,
        bool HasVideo
    );

    /// <summary>
    /// Node đại diện cho một bài kiểm tra trắc nghiệm trong khóa học.
    /// </summary>
    private sealed record QuizNode(
        int Id,
        int? LessonId,
        int? ModuleId,
        QuizPurpose Purpose,
        QuizStatus Status,
        DateTime? AvailableUntil
    );

    /// <summary>
    /// Node đại diện cho một bài tập luyện nói Speaking gắn với bài học.
    /// </summary>
    private sealed record SpeakingScriptNode(
        int ScriptId,
        int LessonId,
        decimal PassingScore
    );

    /// <summary>
    /// Ảnh chụp trạng thái học tập (In-Memory Learning Snapshot) của học viên tại thời điểm kiểm tra.
    /// Toàn bộ dữ liệu được nạp trước (Pre-loaded) vào HashSet O(1) để thuật toán duyệt cây không chạm DB lần 2.
    /// </summary>
    private sealed record LearningSnapshot(
        List<LessonNode> Lessons,
        List<QuizNode> Quizzes,
        HashSet<int> PassedQuizIds,
        HashSet<int> CompletedLessonIds,
        List<int> Modules,
        List<SpeakingScriptNode> SpeakingScripts,
        HashSet<int> PassedSpeakingScriptIds,
        Dictionary<int, DateTime> LessonCompletionDates
    );

    /// <summary>
    /// Hàm tiện ích xác định loại bài tập có phải là bài luyện tập hằng ngày gắn liền với bài học hay không.
    /// PRACTICE cũ và DAILY_PRACTICE đều là bài luyện tập bắt buộc.
    /// </summary>
    private static bool IsPracticePurpose(QuizPurpose purpose) =>
        purpose == QuizPurpose.PRACTICE ||
        purpose == QuizPurpose.DAILY_PRACTICE;

    private static bool IsRequiredAssessment(QuizNode quiz, DateTime now) =>
        quiz.Status == QuizStatus.ACTIVE ||
        (quiz.Status == QuizStatus.INACTIVE && quiz.AvailableUntil.HasValue && quiz.AvailableUntil.Value <= now);
    // PRACTICE lesson quizzes and FINAL_ASSESSMENT use individual seven-day windows.
    // DAILY_PRACTICE keeps its existing scheduled-date behavior.
    private static bool IsSevenDayQuiz(QuizPurpose purpose, int? lessonId) =>
        (purpose == QuizPurpose.PRACTICE && lessonId.HasValue) ||
        purpose == QuizPurpose.FINAL_ASSESSMENT;

    private async Task<(bool Allowed, string? Reason)> CheckSevenDayWindowAsync(
        int learnerId, int courseId, QuizPurpose purpose, int? lessonId, DateTime now)
    {
        if (!IsSevenDayQuiz(purpose, lessonId)) return (true, null);

        int? anchorLessonId = lessonId;
        if (purpose == QuizPurpose.FINAL_ASSESSMENT)
        {
            // Use the last ACTIVE video lesson in curriculum order, not the final quiz itself.
            // This prevents a circular dependency on course completion.
            var moduleIds = await _db.Modules.AsNoTracking()
                .Where(m => m.CourseId == courseId)
                .OrderBy(m => m.OrderIndex).ThenBy(m => m.ModuleId)
                .Select(m => m.ModuleId).ToListAsync();
            var videoLessons = await _db.Lessons.AsNoTracking()
                .Where(l => l.CourseId == courseId && l.Status == LessonStatus.ACTIVE &&
                    l.CourseMaterials.Any(m => m.MaterialType == MaterialType.VIDEO &&
                        ((m.ObjectKey != null && m.ObjectKey != "") ||
                         (m.FileUrl != null && m.FileUrl != ""))))
                .Select(l => new { l.LessonId, l.ModuleId, l.OrderIndex }).ToListAsync();
            anchorLessonId = videoLessons
                .OrderBy(l => l.ModuleId.HasValue && moduleIds.Contains(l.ModuleId.Value)
                    ? moduleIds.IndexOf(l.ModuleId.Value) : int.MaxValue)
                .ThenBy(l => l.OrderIndex).ThenBy(l => l.LessonId)
                .Select(l => (int?)l.LessonId).LastOrDefault();
        }
        if (!anchorLessonId.HasValue)
            return (false, "Không tìm thấy video làm mốc mở Quiz.");

        // Earliest recorded completion is stable across subsequent progress updates.
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


    /// <summary>
    /// - Tải toàn bộ ảnh chụp dữ liệu học tập (Snapshot) của học viên trong khóa học vào bộ nhớ RAM.
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Nạp thứ tự các Module theo OrderIndex.
    ///   - Bước 2: Nạp danh sách bài học ACTIVE kèm cờ kiểm tra HasVideo.
    ///   - Bước 3: Nạp danh sách Quiz thuộc khóa học / bài học / chương học.
    ///   - Bước 4: Nạp danh sách ID các Quiz mà học viên ĐÃ THI ĐỖ (PASSED) vào HashSet O(1).
    ///   - Bước 5: Lấy Enrollment hợp lệ và nạp danh sách LessonId ĐÃ HOÀN THÀNH vào HashSet O(1).
    ///   - Bước 6: Đóng gói thành LearningSnapshot trả về.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Đối tượng LearningSnapshot sẵn sàng cho thuật toán đánh giá.</returns>
    private async Task<LearningSnapshot> LoadAsync(
        int learnerId,
        int courseId)
    {
        // [BƯỚC 1]: Lấy danh sách ModuleId theo đúng thứ tự giảng dạy
        var moduleOrder = await _db.Modules.AsNoTracking()
            .Where(x => x.CourseId == courseId)
            .OrderBy(x => x.OrderIndex)
            .ThenBy(x => x.ModuleId)
            .Select(x => x.ModuleId)
            .ToListAsync();

        // [BƯỚC 2]: Lấy danh sách các bài học đang ACTIVE kèm thuộc tính HasVideo
        // [TẠI SAO DÙNG .Any() TRONG SELECT PROJECTION]:
        //   - EF Core chuyển mệnh đề Any() thành câu lệnh SQL EXISTS (...) cực kỳ nhẹ,
        //     kiểm tra xem bài học có tài liệu dạng VIDEO với đường dẫn hợp lệ hay không
        //     mà không cần kéo toàn bộ bảng CourseMaterials về client.
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

        // [BƯỚC 3]: Lấy toàn bộ Quizzes liên quan đến khóa học (gắn theo Course, Lesson hoặc Module)
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

        // [BƯỚC 4]: Lấy tập hợp QuizId mà học viên đã vượt qua (PASSED)
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

        // [BƯỚC 5]: Lấy các lượt ghi danh hợp lệ (Không ở trạng thái PENDING_PAYMENT)
        var enrollmentIds = await _db.Enrollments.AsNoTracking()
            .Where(e =>
                e.LearnerId == learnerId &&
                e.CourseId == courseId &&
                e.Status != "PENDING_PAYMENT")
            .Select(e => e.EnrollmentId)
            .ToListAsync();

        var lessonIds = lessons.Select(l => l.Id).ToList();

        // [BƯỚC 6]: Lấy danh sách bài học đã hoàn thành video của học viên
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

        // [BƯỚC 7]: Lấy danh sách bài luyện nói Speaking gắn với bài học đang PUBLISHED
        var speakingScripts = await _db.SpeakingScripts.AsNoTracking()
            .Where(s =>
                s.CourseId == courseId &&
                s.LessonId.HasValue &&
                s.Status == SpeakingScriptStatus.PUBLISHED)
            .Select(s => new SpeakingScriptNode(
                s.ScriptId,
                s.LessonId!.Value,
                s.PassingScore))
            .ToListAsync();

        var scriptIds = speakingScripts.Select(s => s.ScriptId).ToList();

        // [BƯỚC 8]: Lấy danh sách SpeakingScript học viên đã thi đạt (Score >= 80 điểm)
        var passedSpeakingScriptIds = scriptIds.Count == 0
            ? new HashSet<int>()
            : (await _db.SpeakingSubmissions.AsNoTracking()
                .Where(sub =>
                    sub.LearnerId == learnerId &&
                    sub.ScriptId.HasValue &&
                    scriptIds.Contains(sub.ScriptId.Value) &&
                    sub.Score.HasValue &&
                    sub.Score.Value >= 80.00m)
                .Select(sub => sub.ScriptId!.Value)
                .Distinct()
                .ToListAsync()).ToHashSet();

        // [BƯỚC 9]: Lấy mốc thời gian hoàn thành video bài học (CompletedAt) để tính quy tắc tự động mở khóa sau 7 ngày
        var lessonCompletionDates =
            enrollmentIds.Count == 0 || lessonIds.Count == 0
                ? new Dictionary<int, DateTime>()
                : await _db.LessonProgresses.AsNoTracking()
                    .Where(p =>
                        enrollmentIds.Contains(p.EnrollmentId) &&
                        lessonIds.Contains(p.LessonId) &&
                        (p.IsCompleted || p.Status == LessonProgressStatus.COMPLETED))
                    .GroupBy(p => p.LessonId)
                    .Select(g => new
                    {
                        LessonId = g.Key,
                        CompletedAt = g.Min(p => p.CompletedAt ?? p.UpdatedAt)
                    })
                    .ToDictionaryAsync(x => x.LessonId, x => x.CompletedAt);

        // [BƯỚC 10]: Trả về bức tranh toàn cảnh (Snapshot) học tập của học viên
        return new LearningSnapshot(
            lessons,
            quizzes,
            passedQuizIds,
            completedLessonIds,
            moduleOrder,
            speakingScripts,
            passedSpeakingScriptIds,
            lessonCompletionDates
        );
    }

    /// <summary>
    /// Sắp xếp danh sách bài học theo đúng trình tự sư phạm:
    /// Module xuất hiện trước xếp trước -> Trong cùng Module xếp theo OrderIndex -> Trùng OrderIndex xếp theo LessonId.
    /// </summary>
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

    /// <summary>
    /// Lấy danh sách bài tập trắc nghiệm thực hành đang ACTIVE gắn với bài học cụ thể.
    /// </summary>
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

    /// <summary>
    /// - Kiểm tra điều kiện hoàn thành bài học: Bắt buộc xem hết video (nếu có video) và đạt toàn bộ Quiz bài tập gắn kèm.
    /// - Trả về null nếu thỏa mãn; ngược lại trả về thông báo lỗi chi tiết.
    /// </summary>
    private static string? CheckLessonCompletionAndPractice(
        LessonNode lesson,
        LearningSnapshot data)
    {
        // [BƯỚC 1]: Rẽ nhánh kiểm tra hoàn thành Video bài giảng
        // - Trường hợp ĐÚNG (TRUE): Bài học có video nhưng học viên chưa xem xong -> Trả về thông báo lỗi.
        // - Trường hợp SAI (FALSE): Đã xem xong video hoặc bài học là tài liệu đọc không có video -> Đi tiếp bước 2.
        if (lesson.HasVideo && !data.CompletedLessonIds.Contains(lesson.Id))
        {
            return $"Vui lòng hoàn thành video của bài học {lesson.Id} trước.";
        }

        // [BƯỚC 2]: Lấy tất cả bài tập trắc nghiệm luyện tập đang ACTIVE của bài học này
        var practices =
            ActivePracticeQuizzesForLesson(data, lesson.Id);

        // [BƯỚC 3]: Rẽ nhánh kiểm tra điểm đạt bài tập
        if (practices.Any(q => BlocksLessonProgress(q, data)))
        {
            return $"Vui lòng đạt tất cả bài tập luyện tập của bài học {lesson.Id} trước.";
        }

        // [BƯỚC 4]: Kiểm tra bài luyện nói Speaking gắn với bài học
        var attachedSpeaking = data.SpeakingScripts.FirstOrDefault(s => s.LessonId == lesson.Id);
        if (attachedSpeaking != null)
        {
            var isPassed = data.PassedSpeakingScriptIds.Contains(attachedSpeaking.ScriptId);
            if (!isPassed)
            {
                // Kiểm tra điều kiện mở khóa tự động sau 7 ngày kể từ khi hoàn thành video
                if (data.LessonCompletionDates.TryGetValue(lesson.Id, out var completedAt))
                {
                    var autoUnlockAt = completedAt.AddDays(7);
                    if (DateTime.UtcNow < autoUnlockAt)
                    {
                        var remainingDays = Math.Max(1, (int)Math.Ceiling((autoUnlockAt - DateTime.UtcNow).TotalDays));
                        return $"Vui lòng đạt bài luyện nói trước đó (từ 80 điểm) hoặc chờ {remainingDays} ngày nữa để tự động mở khóa.";
                    }
                    // Đã qua 7 ngày kể từ khi hoàn thành video -> Thỏa mãn Điều kiện B (Tự động mở khóa tiếp tục học bình thường)
                }
                else
                {
                    return $"Vui lòng hoàn thành video và bài luyện nói của bài học {lesson.Id} trước.";
                }
            }
        }

        // Thỏa mãn toàn bộ điều kiện -> Trả về null
        return null;
    }

    /// <summary>
    /// - Thuật toán cốt lõi tính toán điều kiện khóa của một bài học mục tiêu (target) trong chuỗi bài học đã sắp xếp.
    /// </summary>
    private static string? LessonLock(
        LessonNode target,
        List<LessonNode> ordered,
        LearningSnapshot data)
    {
        var index = ordered.FindIndex(l => l.Id == target.Id);

        // Rẽ nhánh: Nếu bài học không tồn tại trong danh sách Active
        if (index < 0)
            return "Bài học không còn hoạt động.";

        // Rẽ nhánh: Bài học đầu tiên của khóa học (index == 0) LUÔN ĐƯỢC MỞ
        if (index == 0)
            return null;

        // Lấy bài học liền kề ngay phía trước
        var previous = ordered[index - 1];

        // [ĐIỀU KIỆN 1]: Phải hoàn thành toàn bộ video và bài tập của bài học liền trước
        var previousLessonReason =
            CheckLessonCompletionAndPractice(previous, data);

        if (previousLessonReason != null)
            return previousLessonReason;

        // [ĐIỀU KIỆN 2]: KIỂM TRA ĐIỀU KIỆN CHUYỂN CHƯƠNG (MODULE TRANSITION GATE)
        // Khi chuyển sang chương mới (previous.ModuleId khác target.ModuleId)
        if (previous.ModuleId.HasValue &&
            previous.ModuleId != target.ModuleId)
        {
            var previousModuleId = previous.ModuleId.Value;

            // Lấy toàn bộ các bài học thuộc chương trước
            var previousModuleLessons = ordered
                .Where(x => x.ModuleId == previousModuleId)
                .ToList();

            // Kiểm tra từng bài học trong chương trước: Tất cả đều phải xong video và bài tập
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

    /// <summary>
    /// - Tính toán ma trận trạng thái khóa/mở cho toàn bộ danh sách bài học của một khóa học.
    /// - Áp dụng cơ chế Khóa dây chuyền (Cascading Lock): Nếu Bài N bị khóa thì toàn bộ Bài N+1, N+2... đều bị khóa.
    /// - End-to-End Flow: Nạp Snapshot -> Sắp xếp danh sách bài học -> Duyệt từng bài -> Tìm lock của bài trước (priorLock) -> Nếu bài trước bị khóa thì kế thừa lý do; nếu không thì tính LessonLock -> Lưu vào Dictionary.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Dictionary ánh xạ LessonId -> Lý do bị khóa (null nếu bài học được mở).</returns>
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

            // [NGUYÊN LÝ KHÓA DÂY CHUYỀN - CASCADING LOCK]:
            // Kiểm tra xem trong các bài học đứng trước bài này, có bài nào đang bị khóa không.
            // Nếu có ít nhất 1 bài phía trước bị khóa, bài hiện tại chắc chắn bị khóa theo!
            var priorLock = ordered
                .Take(lessonIndex)
                .Select(x => result.GetValueOrDefault(x.Id))
                .FirstOrDefault(reason => reason != null);

            result[lesson.Id] =
                priorLock ?? LessonLock(lesson, ordered, data);
        }

        return result;
    }

    /// <summary>
    /// - Kiểm tra quyền truy cập vào một bài học cụ thể của học viên.
    /// - End-to-End Flow: Lấy CourseId của bài học -> Kiểm tra ghi danh Enrollment -> Gọi GetLessonLocksAsync -> Trả về (true, null) nếu không có lock reason.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>(Allowed, Reason) - Cờ cho phép và chuỗi giải thích nếu bị chặn.</returns>
    public async Task<(bool Allowed, string? Reason)> CheckLessonAsync(
        int learnerId,
        int lessonId)
    {
        // [BƯỚC 1]: Truy vấn CourseId của bài học
        var lesson = await _db.Lessons.AsNoTracking()
            .Where(x => x.LessonId == lessonId)
            .Select(x => new
            { x.CourseId, x.IsRemedial })
            .FirstOrDefaultAsync();

        if (lesson == null)
            return (false, "Không tìm thấy bài học.");

        // [BƯỚC 2]: Kiểm tra học viên đã ghi danh và thanh toán khóa học hay chưa
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

    /// <summary>
    /// - Kiểm tra điều kiện làm bài kiểm tra trắc nghiệm (Quiz Access Gatekeeper).
    /// - Hỗ trợ cả 3 loại bài kiểm tra:
    ///   1. PRACTICE / DAILY_PRACTICE (Luyện tập hằng ngày theo bài học).
    ///   2. CHAPTER_ASSESSMENT (Đánh giá cuối chương).
    ///   3. FINAL_ASSESSMENT (Đánh giá tốt nghiệp cuối khóa).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="quizId">ID bài kiểm tra.</param>
    /// <returns>(Allowed, Reason).</returns>
    public async Task<(bool Allowed, string? Reason)> CheckQuizAsync(
        int learnerId,
        int quizId)
    {
        // [BƯỚC 1]: Lấy thông tin bài Quiz từ Database
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

        // [BƯỚC 2]: Kiểm tra khung thời gian cho phép làm bài (Time Window Check)
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

        if ((quiz.Status != QuizStatus.ACTIVE && !expiredAvailabilityGrant) ||
            (quiz.AvailableFrom.HasValue &&
             now < quiz.AvailableFrom.Value) ||
            (!hasValidRetakeGrant && quiz.AvailableUntil.HasValue &&
             now >= quiz.AvailableUntil.Value))
        if (!IsSevenDayQuiz(quiz.Purpose, quiz.LessonId) &&
            ((quiz.AvailableFrom.HasValue &&
             now < quiz.AvailableFrom.Value) ||
            (quiz.AvailableUntil.HasValue &&
             now >= quiz.AvailableUntil.Value)))
        {
            return (false, "Bài kiểm tra nằm ngoài thời gian được phép làm.");
        }

        // [BƯỚC 3]: Xác định khóa học chủ quản của Quiz
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
            learnerId, courseId.Value, quiz.Purpose, quiz.LessonId, now);
        if (!sevenDayWindow.Allowed) return sevenDayWindow;

        // Kiểm tra ghi danh.

        // [BƯỚC 4]: Kiểm tra ghi danh khóa học của học viên
        var enrolled = await _db.Enrollments.AsNoTracking()
            .AnyAsync(e =>
                e.LearnerId == learnerId &&
                e.CourseId == courseId &&
                e.Status != "PENDING_PAYMENT");

        if (!enrolled)
            return (false, "Bạn cần đăng ký khóa học để tiếp tục.");

        // [BƯỚC 5]: Nạp Snapshot tiến độ học tập và bản đồ khóa bài học
        var data = await LoadAsync(learnerId, courseId.Value);

        var ordered = Ordered(data.Lessons, data.Modules);

        var locks = await GetLessonLocksAsync(
            learnerId,
            courseId.Value);
        // [NHÁNH 1]: BÀI TẬP LUYỆN TẬP HẰNG NGÀY (PRACTICE / DAILY_PRACTICE)
        if (IsPracticePurpose(quiz.Purpose))
        {
            // Kiểm tra bài tập phải được gắn vào một bài học cụ thể
            if (!quiz.LessonId.HasValue)
            {
                return (false, "Bài tập luyện tập phải được gắn với một bài học.");
            }

            // Kiểm tra xem bài học gắn với bài tập này có đang bị khóa hay không
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

            // Bắt buộc học viên phải xem hết video của bài học trước khi mở bài tập làm
            if (quizLesson.HasVideo &&
                !data.CompletedLessonIds.Contains(quiz.LessonId.Value))
            {
                return (false,
                    "Vui lòng hoàn thành video của bài học trước khi làm bài tập.");
            }

            return (true, null);
        }
        // [NHÁNH 2]: BÀI ĐÁNH GIÁ CUỐI CHƯƠNG (CHAPTER ASSESSMENT)
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

            // Bắt buộc toàn bộ các bài học trong chương phải được mở và hoàn thành (video + practice quizzes)
            foreach (var lesson in chapterLessons)
            {
                // Bài học phải được mở theo đúng thứ tự.
                if (locks.GetValueOrDefault(lesson.Id) != null)
                {
                    return (false,
                        "Vui lòng hoàn thành các bài học theo đúng thứ tự trước.");
                }

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
        // [NHÁNH 3]: BÀI THI ĐÁNH GIÁ CUỐI KHÓA (FINAL ASSESSMENT)
        if (quiz.Purpose == QuizPurpose.FINAL_ASSESSMENT)
        {
            return await CheckCourseGatesAsync(
                learnerId,
                courseId.Value,
                requireFinal: false);
        }

        return (false, "Loại bài kiểm tra chưa được hỗ trợ.");
    }

    /// <summary>
    /// - Kiểm tra toàn diện các điều kiện chốt chặn (Gates) của toàn bộ khóa học:
    ///   - Không còn bài học nào bị khóa.
    ///   - Hoàn thành 100% video và đạt tất cả bài tập thực hành.
    ///   - Đạt tất cả bài đánh giá cuối chương (Chapter Assessments).
    ///   - (Tùy chọn) Đạt bài thi đánh giá cuối khóa (Final Assessment).
    /// </summary>
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

        // Kiểm tra 1: Vẫn còn bài học bị khóa trong khóa học
        if (locks.Values.Any(reason => reason != null))
        {
            return (false, "Vẫn còn bài học đang bị khóa.");
        }

        // Kiểm tra 2: Tất cả video và bài tập của từng bài học phải hoàn thành
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

        // Kiểm tra 3: Tất cả bài đánh giá chương phải đạt
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

        // Kiểm tra 4: Đánh giá tốt nghiệp cuối khóa (nếu requireFinal = true, dùng khi cấp chứng chỉ)
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

    /// <summary>
    /// - Kiểm tra xem học viên đã đủ điều kiện nhận Chứng chỉ hoàn thành khóa học hay chưa.
    /// - Đòi hỏi vượt qua 100% cổng (bao gồm cả bài thi Final) và số bài học hoàn thành phải bằng tổng số bài học.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>(Allowed, Reason).</returns>
    public async Task<(bool Allowed, string? Reason)> CheckCertificateAsync(
        int learnerId,
        int courseId)
    {
        // [BƯỚC 1]: Kiểm tra toàn bộ chốt chặn khóa học VÀ bài thi cuối khóa (requireFinal = true)
        var gates = await CheckCourseGatesAsync(
            learnerId,
            courseId,
            requireFinal: true);

        // Nếu bất kỳ điều kiện nào chưa đạt -> Dừng lại và trả về nguyên nhân
        if (!gates.Allowed)
            return gates;

        // [BƯỚC 2]: Xác minh số lượng bài học hoàn thành thực tế trong Database
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

        // Đếm số lượng bài học phân biệt đã hoàn thành
        var completed = await _db.LessonProgresses.AsNoTracking()
            .Where(x =>
                enrollmentIds.Contains(x.EnrollmentId) &&
                lessonIds.Contains(x.LessonId) &&
                (x.IsCompleted ||
                 x.Status == LessonProgressStatus.COMPLETED))
            .Select(x => x.LessonId)
            .Distinct()
            .CountAsync();

        // [BƯỚC 3]: So khớp số bài hoàn thành với tổng số bài ACTIVE
        return completed == lessonIds.Count
            ? (true, null)
            : (false,
                "Vui lòng hoàn thành tất cả bài học trước khi nhận chứng chỉ.");
    }
}
