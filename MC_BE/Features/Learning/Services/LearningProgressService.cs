// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Implementation (Business Logic Layer - Progress & Gamification Domain).
// - Nằm trong module: Features/Learning/Services.
// - Triển khai từ: ILearningProgressService.
// - Vai trò: Trực tiếp điều phối và tính toán toàn bộ tiến độ học tập của học viên ở cấp độ Bài học (Micro-progress)
//   và Khóa học (Macro-progress). Đồng thời quản lý hệ thống Gamification (Chuỗi ngày học - Streak)
//   và Dòng thời gian hoạt động (Recent Activities Timeline).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Theo dõi chi tiết từng giây học của học viên:
//   1. Ghi nhớ điểm dừng phát video (Resume Video Position) để học viên học tiếp trên các thiết bị khác nhau.
//   2. Tính toán tỷ lệ hoàn thành khóa học theo công thức tổng hợp đa thành phần:
//      Tỷ lệ % = (Bài học hoàn thành + Chapter Quiz đạt + Final Quiz đạt + Bài nói độc lập đạt) / Tổng đầu mục bắt buộc.
//   3. Tự động kích hoạt quy trình cấp chứng chỉ số (Auto-issue Certificate) ngay khi tiến độ chạm ngưỡng 100.00%
//      và vượt qua kiểm định của LearningAccessService.
//   4. Tổng hợp hoạt động đa kênh (Học bài, Đạt chứng chỉ, Đăng bài diễn đàn, Thảo luận, Nộp bài Speaking)
//      tạo dòng tin tức học tập sống động.
//   5. Thuật toán tính Streak theo múi giờ Việt Nam (UTC+7) tạo động lực học tập mỗi ngày.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Nhận request từ: LearningController (GET /progress, POST /lessons/{id}/progress, GET /recent-activities, GET /streak).
// - Phối hợp dịch vụ: ICertificateService, ICourseLearningAccessService, ILearningAccessService, IUnitOfWork.
// - Cơ sở dữ liệu: Enrollments, Lessons, LessonProgresses, Quizzes, QuizAttempts, SpeakingScripts, SpeakingSubmissions, Forum.
// ====================================================================================================

using System;
using System.Collections.Generic;
using System.Linq;
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

/// <summary>
/// Lớp triển khai dịch vụ quản lý tiến độ học tập, dòng hoạt động và Gamification Streak.
/// </summary>
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

    /// <summary>
    /// Khởi tạo LearningProgressService với đầy đủ các kho lưu trữ và dịch vụ phối hợp.
    /// </summary>
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
        _courseAccess = courseAccess;
        _access = access;
        _db = db;
    }

    /// <summary>
    /// Lấy bức tranh tiến độ học tập toàn diện của học viên trong một khóa học cụ thể.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Kiểm tra quyền truy cập khóa học qua _courseAccess.CanAccessCourseAsync.</para>
    /// <para>Bước 2: Tìm bản ghi Enrollment kèm danh sách LessonProgresses.</para>
    /// <para>Bước 3: Tải danh sách bài học ACTIVE, sắp xếp theo OrderIndex và map tiến độ từng bài.</para>
    /// <para>Bước 4: Nạp danh sách Chapter Quiz và Final Quiz đang ACTIVE, đếm số Quiz đã PASS.</para>
    /// <para>Bước 5: Nạp danh sách bài tập nói Speaking độc lập, đếm số bài nộp đạt điểm >= 80.</para>
    /// <para>Bước 6: Tính toán tỷ lệ hoàn thành tổng thể (CompletionPercentage) theo công thức chuẩn.</para>
    /// <para>Bước 7: Thẩm định điều kiện nhận chứng chỉ và đồng bộ % mới vào Enrollment nếu có sai lệch.</para>
    /// <para>Bước 8: Trả về CourseLearningProgressDto.</para>
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>CourseLearningProgressDto hoặc null nếu không có quyền/chưa ghi danh.</returns>
    public async Task<CourseLearningProgressDto?> GetCourseProgressAsync(int learnerId, int courseId)
    {
        // [BƯỚC 1]: Kiểm tra quyền hạn truy cập khóa học của học viên
        // Rẽ nhánh: Nếu không có quyền (chưa mua hoặc hết hạn) -> Trả về null ngay
        if (!await _courseAccess.CanAccessCourseAsync(courseId, learnerId, isAdmin: false)) return null;

        // [BƯỚC 2]: Truy vấn bản ghi Ghi danh (Enrollment) kèm thông tin bài học và tiến độ đã lưu
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId && e.CourseId == courseId,
            e => e.Course,
            e => e.LessonProgresses);

        var enrollment = enrollments.FirstOrDefault();

        // Rẽ nhánh: Nếu không tìm thấy bản ghi Enrollment -> Trả về null
        if (enrollment == null)
        {
            return null;
        }

        // [BƯỚC 3]: Lấy danh sách bài học ACTIVE của khóa học và sắp xếp theo OrderIndex
        var lessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == courseId && l.Status == LessonStatus.ACTIVE);

        var lessons = lessonsList
            .OrderBy(l => l.OrderIndex)
            .ToList();

        var totalLessons = lessons.Count;

        // Tối ưu hóa tra cứu O(1) bằng Dictionary
        var lessonProgressDict = (enrollment.LessonProgresses ?? new List<LessonProgress>())
            .ToDictionary(lp => lp.LessonId);

        var progressDtos = new List<LessonProgressDto>();
        int completedCount = 0;

        // Duyệt từng bài học để ánh xạ dữ liệu tiến độ chi tiết
        foreach (var lesson in lessons)
        {
            // Rẽ nhánh: Kiểm tra bài học đã có bản ghi tiến độ trong CSDL hay chưa
            if (lessonProgressDict.TryGetValue(lesson.LessonId, out var progress))
            {
                // Điều kiện hoàn thành: Thuộc tính IsCompleted = true HOẶC Status = COMPLETED
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
                // Trường hợp học viên chưa từng mở bài học này (Tiến độ mặc định 0)
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

        // [BƯỚC 4]: TÍNH TOÁN CÁC ĐẦU MỤC BÀI TẬP BỔ SUNG (QUIZZES & SPEAKING SCRIPTS)
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

        // [BƯỚC 5]: TỔNG HỢP CÔNG THỨC TIẾN ĐỘ TOÀN DIỆN (COMPREHENSIVE COMPLETION FORMULA)
        // Tổng số đầu mục bắt buộc = số bài học ACTIVE + số Chapter Quiz ACTIVE + số Final Quiz ACTIVE + số bài nói độc lập
        int totalRequiredItems = totalLessons + activeChapterQuizzes.Count + activeFinalQuizzes.Count + standaloneSpeakingScripts.Count;
        int completedRequiredItems = completedCount + passedChapterCount + passedFinalCount + passedSpeakingCount;

        decimal completionPercentage = totalRequiredItems > 0
            ? Math.Round((decimal)completedRequiredItems / totalRequiredItems * 100, 2)
            : 0m;

        // [BƯỚC 6]: Thẩm định điều kiện nhận chứng chỉ từ LearningAccessService (yêu cầu PASS cả bài thi cuối khóa)
        var certAccess = await _access.CheckCertificateAsync(learnerId, courseId);

        // Kiểm tra xem chứng chỉ đã tồn tại trong CSDL hay chưa
        // Check if certificate exists
        var certs = await _certificateRepository.FindAsync(
            c => c.EnrollmentId == enrollment.EnrollmentId);

        var certificate = certs.FirstOrDefault();

        // Khóa học hoàn thành khi: Đạt 100% tiến độ VÀ thỏa mãn điều kiện chứng chỉ, HOẶC đã có chứng chỉ trong CSDL
        bool isCompleted = (completionPercentage >= 100.00m && certAccess.Allowed) || certificate != null;

        // [BƯỚC 7]: Tự động đồng bộ CompletionPercentage vào bảng Enrollments nếu có sự thay đổi
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

        // [BƯỚC 8]: Trả về DTO hoàn chỉnh cho Client
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

    /// <summary>
    /// Cập nhật tiến độ của một bài học (vị trí xem video, tổng thời gian học, cờ hoàn thành).
    /// Tự động tính toán lại % khóa học và phát hành chứng chỉ nếu đạt 100%.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Validate bài học và quyền truy cập khóa học.</para>
    /// <para>Bước 2: Tìm Enrollment hợp lệ (ACTIVE/COMPLETED và chưa hết hạn).</para>
    /// <para>Bước 3: Gọi _access.CheckLessonAsync để đảm bảo bài học không bị khóa.</para>
    /// <para>Bước 4: Tạo mới hoặc cập nhật bản ghi LessonProgress trong CSDL.</para>
    /// <para>Bước 5: Bắt ngoại lệ DbUpdateException để triệt tiêu lỗi Race Condition khi heartbeat gửi dồn dập.</para>
    /// <para>Bước 6: Tính toán lại tỷ lệ hoàn thành mới của toàn bộ khóa học.</para>
    /// <para>Bước 7: Nếu newPercentage >= 100% và đủ điều kiện -> Tự động gọi IssueCertificateAsync.</para>
    /// <para>Bước 8: Trả về GetCourseProgressAsync mới nhất.</para>
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="request">Dữ liệu tiến độ từ video player.</param>
    /// <returns>CourseLearningProgressDto mới nhất.</returns>
    public async Task<CourseLearningProgressDto?> UpdateLessonProgressAsync(
        int learnerId, int lessonId, UpdateLessonProgressRequest request)
    {
        // [BƯỚC 1]: Kiểm tra bài học tồn tại và quyền truy cập khóa học
        var lesson = await _lessonRepository.GetByIdAsync(lessonId);
        if (lesson == null) return null;
        if (!await _courseAccess.CanAccessCourseAsync(lesson.CourseId, learnerId, isAdmin: false)) return null;

        // [BƯỚC 2]: Truy vấn bản ghi ghi danh hợp lệ (Ưu tiên bản ghi ACTIVE, còn hạn dùng)
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

        // [BƯỚC 3]: KIỂM TRA ĐIỀU KIỆN KHÓA BÀI HỌC (POLICY GATE CHECK)
        // Học viên không thể tự ý gửi request fake tiến độ của bài học đang bị khóa!
        var decision = await _access.CheckLessonAsync(learnerId, lessonId);
        if (!decision.Allowed) throw new InvalidOperationException(decision.Reason ?? "Lesson locked.");

        // [BƯỚC 4]: Tìm kiếm hoặc tạo mới bản ghi LessonProgress
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

        // [BƯỚC 5]: Cập nhật các trường dữ liệu theo Request gửi lên
        // 5.1: Cập nhật trạng thái hoàn thành bài học
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

        // 5.2: Cập nhật vị trí dừng video gần nhất (giây)
        if (request.LastPositionSeconds.HasValue)
        {
            progress.LastPositionSeconds = Math.Max(0, request.LastPositionSeconds.Value);
        }

        // 5.3: Cập nhật tổng thời gian học tích lũy
        if (request.TimeSpentSeconds.HasValue)
        {
            progress.TimeSpentSeconds = Math.Max(progress.TimeSpentSeconds, request.TimeSpentSeconds.Value);
            progress.TimeSpentMinutes = progress.TimeSpentSeconds / 60;
        }

        progress.LastAccessedAt = DateTime.UtcNow;
        progress.UpdatedAt = DateTime.UtcNow;

        // EF Core tracks this entity so we don't need to call Update() explicitly

        // [BƯỚC 6]: Xử lý Race Condition khi lưu tiến độ
        // [TẠI SAO DÙNG TRY/CATCH DbUpdateException]:
        //   - Trong môi trường thực tế, video player thường gửi heartbeat định kỳ (mỗi 5s - 10s) hoặc khi
        //     học viên mở 2 tab cùng lúc. DbUpdateException bắt gọn lỗi trùng khóa (Duplicate Key) và bỏ qua an toàn,
        //     giúp hệ thống không bị crash 500.
        try
        {
            await _unitOfWork.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Suppress duplicate key error from concurrent requests
        }

        // [BƯỚC 7]: TÍNH TOÁN LẠI TỶ LỆ HOÀN THÀNH MỚI CỦA KHÓA HỌC
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

        // [BƯỚC 8]: TỰ ĐỘNG CẤP CHỨNG CHỈ SỐ KHI ĐẠT 100% TIẾN ĐỘ (AUTO-ISSUANCE WORKFLOW)
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
                    // Bỏ qua ngoại lệ nếu chứng chỉ đã được cấp bởi tiến trình chạy song song khác
                }
            }
        }

        return await GetCourseProgressAsync(learnerId, lesson.CourseId);
    }

    /// <summary>
    /// Lấy danh sách các hoạt động học tập gần đây nhất của học viên trên toàn hệ thống
    /// (Hoàn thành bài học, Đạt chứng chỉ, Đăng ký khóa học mới, Diễn đàn, Nộp bài nói).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="limit">Số lượng hoạt động tối đa (mặc định 10).</param>
    /// <returns>Danh sách ActivityLogDto đã format thời gian hiển thị tương đối.</returns>
    public async Task<List<ActivityLogDto>> GetRecentActivitiesAsync(int learnerId, int limit = 10)
    {
        var activities = new List<ActivityLogDto>();

        // [HOẠT ĐỘNG 1]: Hoàn thành bài học
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

        // [HOẠT ĐỘNG 2]: Đạt chứng chỉ khóa học
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

        // [HOẠT ĐỘNG 3]: Đăng ký khóa học mới
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

        // [HOẠT ĐỘNG 4]: Đăng bài viết thảo luận trên diễn đàn
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

        // [HOẠT ĐỘNG 5]: Bình luận trên diễn đàn
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

        // [HOẠT ĐỘNG 6]: Thả cảm xúc phản hồi (Reactions)
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

        // [HOẠT ĐỘNG 7]: Nộp bài luyện nói Speaking
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

        // [BƯỚC CUỐI]: Sắp xếp giảm dần theo ngày, lấy top N và format thời gian tương đối
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

    /// <summary>
    /// Thuật toán Gamification tính toán chuỗi ngày học liên tục (Learning Streak) của học viên
    /// theo chuẩn múi giờ Việt Nam (UTC+7).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>LearningStreakDto chứa CurrentStreak và LongestStreak.</returns>
    public async Task<LearningStreakDto> GetLearningStreakAsync(int learnerId)
    {
        // [BƯỚC 1]: Lấy các bài học mà học viên đã hoàn thành hoặc có mốc thời gian hoàn thành
        var completedLessons = await _progressRepository.FindAsync(
            p => p.Enrollment.LearnerId == learnerId && (p.CompletedAt.HasValue || p.IsCompleted));

        // [BƯỚC 2]: Chuyển đổi toàn bộ mốc thời gian sang ngày lịch theo múi giờ Việt Nam (UTC+7)
        // [TẠI SAO PHẢI CỘNG 7 GIỜ (AddHours(7))]:
        //   - Tránh lỗi lệch ngày của múi giờ UTC: Nếu học viên học lúc 23:30 đêm tại Hà Nội (UTC+7),
        //     giờ UTC sẽ là 16:30 chiều cùng ngày. Việc quy đổi sang giờ địa phương đảm bảo chuỗi ngày
        //     tính theo đúng ngày thực tế của học viên.
        var dates = completedLessons
            .Select(p => (p.CompletedAt ?? p.UpdatedAt).AddHours(7).Date) // Convert to Vietnam time (UTC+7)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        int currentStreak = 0;
        int longestStreak = 0;
        var todayVn = DateTime.UtcNow.AddHours(7).Date;

        // [BƯỚC 3]: Thuật toán duyệt chuỗi ngày tăng dần
        if (dates.Count > 0)
        {
            currentStreak = 1;
            longestStreak = 1;

            for (int i = 1; i < dates.Count; i++)
            {
                // Nếu khoảng cách giữa 2 mốc học liên tiếp là đúng 1 ngày -> Chuỗi tăng thêm 1
                if ((dates[i] - dates[i - 1]).TotalDays == 1)
                {
                    currentStreak++;
                }
                else
                {
                    // Ngắt quãng quá 1 ngày -> Reset chuỗi về 1
                    currentStreak = 1; // Reset streak
                }

                // Cập nhật kỷ lục chuỗi dài nhất
                if (currentStreak > longestStreak)
                {
                    longestStreak = currentStreak;
                }
            }

            // [BƯỚC 4]: Kiểm tra xem chuỗi hiện tại có còn hiệu lực không
            // Nếu ngày học cuối cùng là từ trước hôm qua (cách > 1 ngày so với hôm nay) -> Chuỗi bị đứt (currentStreak = 0)
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
