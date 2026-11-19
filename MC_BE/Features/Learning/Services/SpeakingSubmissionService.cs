// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Implementation (Business Logic Layer - Speaking Submission & Assessment Domain).
// - Nằm trong module: Features/Learning/Services.
// - Triển khai từ: ISpeakingSubmissionService.
// - Vai trò: Quản lý toàn bộ vòng đời của Bài nộp thực hành nói Speaking: từ lúc học viên tải file ghi âm lên,
//   lưu trữ đám mây Cloudinary, kiểm tra điều kiện nộp/chặn nộp lại, đến quy trình Giảng viên chấm điểm,
//   nhận xét và tự động đồng bộ trạng thái hoàn thành bài học sang LessonProgress.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Kiểm soát chặt chẽ luồng nộp bài luyện nói MC:
//   1. Thẩm định định dạng âm thanh chuẩn (.mp3, .wav, .m4a, .ogg...).
//   2. Xác minh quyền ghi danh (Enrollment) và quyền truy cập khóa học của học viên trước khi nộp.
//   3. CƠ CHẾ KHÓA NỘP BÀI THÔNG MINH (RESUBMISSION LOCK):
//      - Nếu bài nộp trước đang chờ chấm (Status == SUBMITTED hoặc Score == null): Chặn nộp đè để tránh spam.
//      - Nếu bài nộp trước đã đạt điểm chuẩn (Score >= 80): Khóa nộp lại vì đã đạt chuẩn đầu ra.
//      - Nếu bài nộp trước bị trượt (Score < 80 và đã chấm xong): Cho phép ghi đè/nộp lại để cải thiện điểm.
//   4. Phân quyền chấm điểm khắt khe (Instructor Grading Authorization): Chỉ giảng viên phụ trách khóa học
//      mới được phép chấm điểm và ghi nhận xét.
//   5. Đồng bộ liên thông (Cross-entity Synchronization): Khi bài nói được chấm ĐẠT (>= 80), hệ thống tự động
//      đánh dấu hoàn thành bài học (LessonProgress.IsCompleted = true) để mở khóa bài học tiếp theo.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Nhận request từ: SpeakingSubmissionsController.
// - Tương tác Cloud: ICloudinaryService (Upload audio binary).
// - Repositories: ISpeakingSubmissionRepository, ISpeakingScriptRepository, IGenericRepository<Lesson>,
//   <Enrollment>, <LessonProgress>, IUnitOfWork.
// - Dịch vụ phối hợp: ICourseLearningAccessService.
// ====================================================================================================

using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Services;

/// <summary>
/// Lớp triển khai dịch vụ quản lý nộp bài tập nói và chấm điểm Speaking.
/// </summary>
public class SpeakingSubmissionService : ISpeakingSubmissionService
{
    private readonly ISpeakingSubmissionRepository _submissionRepository;
    private readonly ISpeakingScriptRepository _scriptRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IGenericRepository<LessonProgress> _lessonProgressRepository;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SpeakingSubmissionService> _logger;
    private readonly ICourseLearningAccessService _courseAccess;
    private readonly IRemedialAssignmentService _remedialAssignments;

    /// <summary>
    /// Khởi tạo SpeakingSubmissionService với đầy đủ các kho lưu trữ và dịch vụ lưu trữ đám mây.
    /// </summary>
    public SpeakingSubmissionService(
        ISpeakingSubmissionRepository submissionRepository,
        ISpeakingScriptRepository scriptRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        IGenericRepository<LessonProgress> lessonProgressRepository,
        ICloudinaryService cloudinaryService,
        IUnitOfWork unitOfWork,
        ILogger<SpeakingSubmissionService> logger,
        ICourseLearningAccessService courseAccess,
        IRemedialAssignmentService remedialAssignments)
    {
        _submissionRepository = submissionRepository;
        _scriptRepository = scriptRepository;
        _lessonRepository = lessonRepository;
        _enrollmentRepository = enrollmentRepository;
        _lessonProgressRepository = lessonProgressRepository;
        _cloudinaryService = cloudinaryService;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _courseAccess = courseAccess;
        _remedialAssignments = remedialAssignments;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Học viên nộp bài tập ghi âm luyện nói theo LessonId hoặc ScriptId.
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Validate file ghi âm (tồn tại, không rỗng, đuôi file âm thanh hợp lệ trong whitelist).
    ///   - Bước 2: Phân giải CourseId, ScriptId, LessonId từ dữ liệu gửi lên.
    ///   - Bước 3: Kiểm tra quyền truy cập khóa học và bản ghi Ghi danh (Enrollment) hợp lệ.
    ///   - Bước 4: Tra cứu bài nộp gần nhất (existingSubmission) để áp dụng quy chế Khóa nộp bài.
    ///   - Bước 5: Upload file ghi âm lên Cloudinary thư mục 'speaking_submissions'.
    ///   - Bước 6: Ghi đè bài nộp cũ (nếu thi lại khi bị trượt) hoặc Tạo mới bản ghi SpeakingSubmission (Status = SUBMITTED).
    ///   - Bước 7: Commit transaction qua UnitOfWork và trả về SpeakingSubmissionResponseDto.
    /// </summary>
    /// <param name="learnerId">ID học viên nộp bài.</param>
    /// <param name="request">Dữ liệu nộp bài (file audio, ghi chú, lessonId, scriptId).</param>
    /// <returns>SpeakingSubmissionResponseDto chứa thông tin bài nộp mới tạo.</returns>
    public async Task<SpeakingSubmissionResponseDto> SubmitSpeakingAssignmentAsync(int learnerId, CreateSpeakingSubmissionRequest request)
    {
        try
        {
            // ====================================================================================================
            // [BƯỚC 1]: KIỂM TRA HỢP LỆ CỦA FILE ÂM THANH ĐẦU VÀO
            // ====================================================================================================
            // [BƯỚC 1.1]: Kiểm tra file có bị null hoặc kích thước 0 byte không
            if (request.AudioFile == null || request.AudioFile.Length == 0)
            {
                var errMsg = "Error: Audio file is empty or missing.";
                _logger.LogError(errMsg);
                throw new ArgumentException("Audio file is required.");
            }

            // [BƯỚC 1.2]: Kiểm tra danh sách phần mở rộng tập tin âm thanh hợp lệ (Audio Whitelist)
            var extension = Path.GetExtension(request.AudioFile.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac" };
            if (!allowedExtensions.Contains(extension))
            {
                var errMsg = $"Error: Invalid audio file format '{extension}'. Only .mp3 and .wav files are allowed.";
                _logger.LogError(errMsg);
                throw new ArgumentException("Invalid audio file format. Only .mp3 and .wav formats are allowed.");
            }

            // ====================================================================================================
            // [BƯỚC 2]: PHÂN GIẢI NGỮ CẢNH BÀI TẬP (COURSE, SCRIPT, LESSON RESOLUTION)
            // ====================================================================================================
            int courseId = 0;
            int? scriptId = request.ScriptId;
            int? lessonId = request.LessonId;
            SpeakingScript? script = null;
            Lesson? lesson = null;

            // [BƯỚC 2.1]: Trường hợp nộp trực tiếp với ScriptId (Bài thi Speaking độc lập / Final / Chapter)
            if (scriptId.HasValue && scriptId.Value > 0)
            {
                script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId.Value);
                if (script == null)
                {
                    throw new KeyNotFoundException($"Không tìm thấy bài tập nói với ID {scriptId.Value}.");
                }
                courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
                lessonId = script.LessonId ?? lessonId;
            }
            // [BƯỚC 2.2]: Trường hợp nộp theo LessonId (Bài tập thực hành trong bài học)
            else if (lessonId.HasValue && lessonId.Value > 0)
            {
                var lessons = await _lessonRepository.FindAsync(
                    l => l.LessonId == lessonId.Value,
                    l => l.Course);
                lesson = lessons.FirstOrDefault();
                if (lesson == null)
                {
                    throw new KeyNotFoundException($"Lesson with ID {lessonId.Value} was not found.");
                }
                courseId = lesson.CourseId;
                script = await _scriptRepository.GetByLessonIdAsync(lessonId.Value);
                if (script != null)
                {
                    scriptId = script.ScriptId;
                }
            }
            // [BƯỚC 2.3]: Cả ScriptId và LessonId đều không được cung cấp -> Ném lỗi tham số
            else
            {
                throw new ArgumentException("Vui lòng cung cấp LessonId hoặc ScriptId để nộp bài nói.");
            }

            // ====================================================================================================
            // [BƯỚC 3]: XÁC MINH QUYỀN TRUY CẬP VÀ GHI DANH KHÓA HỌC
            // ====================================================================================================
            if (courseId <= 0 || !await _courseAccess.CanAccessCourseAsync(courseId, learnerId, isAdmin: false))
                throw new InvalidOperationException("Bạn không có quyền truy cập khóa học này.");

            var enrollments = await _enrollmentRepository.FindAsync(
                e => e.LearnerId == learnerId && e.CourseId == courseId);
            if (!enrollments.Any())
            {
                var errMsg = $"Error: Learner ID {learnerId} is not enrolled in Course ID {courseId}.";
                _logger.LogError(errMsg);
                throw new InvalidOperationException("You must be enrolled in this course to submit assignments.");
            }

            if (script?.IsRemedial == true &&
                (!await _remedialAssignments.CanAccessContentAsync(learnerId, "SPEAKING", script.ScriptId) ||
                 !await _remedialAssignments.CanStartAttemptAsync(learnerId, "SPEAKING", script.ScriptId)))
                throw new InvalidOperationException("Bài bổ trợ đã hết lượt, đã hoàn thành hoặc khóa học hiện không còn quyền truy cập.");

            // ====================================================================================================
            // [BƯỚC 4]: QUY CHẾ KHÓA NỘP BÀI (RESUBMISSION LOCK BUSINESS RULES)
            // ====================================================================================================
            SpeakingSubmission? existingSubmission = null;
            if (scriptId.HasValue)
            {
                existingSubmission = await _submissionRepository.GetLatestByLearnerAndScriptAsync(learnerId, scriptId.Value);
            }
            if (existingSubmission == null && lessonId.HasValue)
            {
                existingSubmission = await _submissionRepository.GetLatestByLearnerAndLessonAsync(learnerId, lessonId.Value);
            }

            var hasOfficialRetake = script != null && !script.IsRemedial &&
                await _remedialAssignments.HasSpeakingRetakeGrantAsync(learnerId, script.ScriptId);
            if (script != null && !script.IsRemedial && script.DueAt.HasValue && script.DueAt.Value <= DateTime.UtcNow && !hasOfficialRetake)
                throw new InvalidOperationException("Hạn nộp bài Speaking đã qua. Hãy liên hệ giảng viên để được giao bài bổ trợ và mở lượt nộp mới trong 7 ngày.");
            var hasPassedOfficialSubmission = script != null && !script.IsRemedial &&
                (await _submissionRepository.FindAsync(s => s.LearnerId == learnerId && s.ScriptId == script.ScriptId && s.Score >= 80)).Any();
            if (hasPassedOfficialSubmission)
                throw new InvalidOperationException("Bạn đã đạt bài Speaking này; không cần làm bài bổ trợ hoặc nộp lại.");

            if (existingSubmission != null)
            {
                // [KHÓA 1]: Bài nộp trước đang chờ giảng viên chấm (Score == null hoặc Status == SUBMITTED)
                if (existingSubmission.Score == null || existingSubmission.Status == SpeakingSubmissionStatus.SUBMITTED)
                {
                    var errMsg = "Bài nộp của bạn đang chờ giảng viên chấm, không thể nộp lại lúc này.";
                    _logger.LogWarning("Duplicate speaking submission attempt: Learner {LearnerId} on Script {ScriptId} / Lesson {LessonId}", learnerId, scriptId, lessonId);
                    throw new InvalidOperationException(errMsg);
                }

                if (existingSubmission.Score >= 80 && script?.IsRemedial != true)
                {
                    var errMsg = "Bạn đã đạt yêu cầu bài thi nói này (≥ 80 điểm), không cần nộp lại.";
                    _logger.LogWarning("Learner {LearnerId} already passed Script {ScriptId} / Lesson {LessonId} with score {Score}", learnerId, scriptId, lessonId, existingSubmission.Score);
                    throw new InvalidOperationException(errMsg);
                }

                // Nếu Score < 80 và Status != SUBMITTED: Học viên bị trượt ở lần trước -> Đi tiếp xuống nộp lại
            }

            // ====================================================================================================
            // [BƯỚC 5]: TẢI TẬP TIN GHI ÂM LÊN ĐÁM MÂY CLOUDINARY
            // ====================================================================================================
            var uploadResult = await _cloudinaryService.UploadVideoAsync(request.AudioFile, "speaking_submissions");
            if (uploadResult == null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
            {
                var errMsg = "Error: Failed to upload audio file to Cloudinary.";
                _logger.LogError(errMsg);
                throw new InvalidOperationException("Failed to upload audio file to storage.");
            }

            var audioUrl = uploadResult.SecureUrl.ToString();

            // Preserve every resubmission as a separate attempt for audit/history.
            var submission = new SpeakingSubmission
            {
                ScriptId = scriptId,
                LessonId = lessonId,
                LearnerId = learnerId,
                AudioUrl = audioUrl,
                Note = request.Note,
                Status = SpeakingSubmissionStatus.SUBMITTED,
                SubmittedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _submissionRepository.AddAsync(submission);

            // [BƯỚC 7]: Lưu giao dịch vào CSDL
            await _unitOfWork.SaveChangesAsync();
            if (script?.IsRemedial == true)
                await _remedialAssignments.RecordAttemptResultAsync(learnerId, "SPEAKING", script.ScriptId, passed: false);
            else if (hasOfficialRetake && script != null)
                await _remedialAssignments.ConsumeSpeakingRetakeGrantAsync(learnerId, script.ScriptId);

            // [BƯỚC 8]: Nạp lại đầy đủ chi tiết quan hệ (Giảng viên, Khóa học, Học viên) và trả về DTO
            var fullSubmission = await _submissionRepository.GetByIdWithDetailsAsync(submission.SubmissionId);
            return MapToResponseDto(fullSubmission ?? submission);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in SubmitSpeakingAssignmentAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

    /// <summary>
    /// Lấy bài nộp gần đây nhất của học viên trong một bài học cụ thể.
    /// </summary>
    public async Task<SpeakingSubmissionResponseDto?> GetLatestSubmissionByLessonAsync(int learnerId, int lessonId)
    {
        try
        {
            var submission = await _submissionRepository.GetLatestByLearnerAndLessonAsync(learnerId, lessonId);
            return submission != null ? MapToResponseDto(submission) : null;
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GetLatestSubmissionByLessonAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

    /// <summary>
    /// Lấy bài nộp gần đây nhất của học viên theo kịch bản nói.
    /// </summary>
    public async Task<SpeakingSubmissionResponseDto?> GetLatestSubmissionByScriptAsync(int learnerId, int scriptId)
    {
        try
        {
            var submission = await _submissionRepository.GetLatestByLearnerAndScriptAsync(learnerId, scriptId);
            return submission != null ? MapToResponseDto(submission) : null;
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GetLatestSubmissionByScriptAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

    /// <summary>
    /// Lấy toàn bộ lịch sử các bài tập nói đã nộp của học viên hiện tại.
    /// </summary>
    public async Task<IEnumerable<SpeakingSubmissionResponseDto>> GetMySubmissionsAsync(int learnerId)
    {
        try
        {
            var submissions = await _submissionRepository.GetSubmissionsByLearnerAsync(learnerId);
            return submissions.Select(MapToResponseDto);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GetMySubmissionsAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

    /// <summary>
    /// Lấy danh sách các bài nộp cần chấm thuộc tất cả các khóa học do giảng viên này phụ trách.
    /// </summary>
    public async Task<IEnumerable<SpeakingSubmissionResponseDto>> GetSubmissionsForInstructorAsync(int instructorId)
    {
        try
        {
            var submissions = await _submissionRepository.GetSubmissionsByInstructorAsync(instructorId);
            return submissions.Select(MapToResponseDto);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GetSubmissionsForInstructorAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

    /// <summary>
    /// Lấy danh sách bài nộp của một khóa học cụ thể dành cho giảng viên phụ trách khóa học đó.
    /// </summary>
    public async Task<IEnumerable<SpeakingSubmissionResponseDto>> GetSubmissionsByCourseForInstructorAsync(int instructorId, int courseId)
    {
        try
        {
            var submissions = await _submissionRepository.GetSubmissionsByCourseAsync(courseId);
            var filtered = submissions.Where(s =>
                (s.Lesson?.Course?.InstructorId == instructorId) ||
                (s.SpeakingScript?.Course?.InstructorId == instructorId));
            return filtered.Select(MapToResponseDto);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GetSubmissionsByCourseForInstructorAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Giảng viên thực hiện chấm điểm và viết nhận xét cho bài nộp Speaking.
    /// - Tự động cập nhật tiến độ hoàn thành bài học (LessonProgress) nếu điểm đạt chuẩn (>= 80).
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Validate điểm số trong thang điểm 0 - 100.
    ///   - Bước 2: Tìm bài nộp kèm thông tin chi tiết qua GetByIdWithDetailsAsync.
    ///   - Bước 3: Xác minh quyền giảng viên của khóa học (Authorization Check).
    ///   - Bước 4: Cập nhật Score, Feedback, GradedById, GradedAt và trạng thái (GRADED nếu >= 80, ngược lại NEEDS_RESUBMISSION).
    ///   - Bước 5: Đồng bộ trạng thái hoàn thành bài học sang bảng LessonProgresses.
    ///   - Bước 6: Commit transaction và trả về SpeakingSubmissionResponseDto.
    /// </summary>
    /// <param name="instructorId">ID giảng viên chấm bài.</param>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <param name="request">Điểm số và nhận xét.</param>
    /// <returns>SpeakingSubmissionResponseDto sau khi chấm điểm.</returns>
    public async Task<SpeakingSubmissionResponseDto?> GradeSubmissionAsync(int instructorId, int submissionId, GradeSpeakingSubmissionRequest request)
    {
        try
        {
            // [BƯỚC 1]: Kiểm tra thang điểm hợp lệ từ 0 đến 100
            if (request.Score < 0 || request.Score > 100)
            {
                throw new ArgumentException("Score must be between 0 and 100.");
            }

            // [BƯỚC 2]: Truy vấn bài nộp kèm quan hệ
            var submission = await _submissionRepository.GetByIdWithDetailsAsync(submissionId);
            if (submission == null)
            {
                return null;
            }

            // [BƯỚC 3]: XÁC MINH QUYỀN HẠN CỦA GIẢNG VIÊN (AUTHORIZATION CHECK)
            var courseInstructorId = submission.Lesson?.Course?.InstructorId
                ?? submission.SpeakingScript?.Course?.InstructorId;

            // Rẽ nhánh: Nếu người chấm không phải giảng viên của khóa học này -> Từ chối!
            if (courseInstructorId != instructorId)
            {
                throw new UnauthorizedAccessException("You are not authorized to grade this submission.");
            }

            // [BƯỚC 4]: Đánh giá Đạt/Không đạt dựa trên ngưỡng chuẩn 80 điểm
            var isPassed = request.Score >= 80;

            submission.Score = request.Score;
            submission.Feedback = request.Feedback;
            submission.GradedById = instructorId;
            submission.GradedAt = DateTime.UtcNow;
            submission.Status = isPassed ? SpeakingSubmissionStatus.GRADED : SpeakingSubmissionStatus.NEEDS_RESUBMISSION;
            submission.UpdatedAt = DateTime.UtcNow;

            _submissionRepository.Update(submission);

            // Cập nhật tiến độ hoàn thành bài học (LessonProgress) nếu có gắn bài học
            var remedialScript = submission.SpeakingScript ?? submission.Lesson?.SpeakingScript;
            if (remedialScript?.IsRemedial == true)
                await _remedialAssignments.CompleteSpeakingAttemptAsync(submission.LearnerId, remedialScript.ScriptId, isPassed);
            else if (isPassed && remedialScript != null)
                await _remedialAssignments.RevokeSpeakingRetakeGrantsAsync(submission.LearnerId, remedialScript.ScriptId);

            if (submission.Lesson != null && submission.LessonId.HasValue && submission.Lesson.IsRemedial == false && remedialScript?.IsRemedial != true)
            {
                var enrollments = await _enrollmentRepository.FindAsync(
                    e => e.LearnerId == submission.LearnerId && e.CourseId == submission.Lesson.CourseId);
                var enrollment = enrollments.FirstOrDefault();
                if (enrollment != null)
                {
                    var progresses = await _lessonProgressRepository.FindAsync(
                        lp => lp.EnrollmentId == enrollment.EnrollmentId && lp.LessonId == submission.LessonId.Value);
                    var progress = progresses.FirstOrDefault();
                    
                    // Nhánh 5.1: Nếu bài học chưa có bản ghi tiến độ -> Tạo mới với trạng thái tương ứng điểm số
                    if (progress == null)
                    {
                        progress = new LessonProgress
                        {
                            EnrollmentId = enrollment.EnrollmentId,
                            LessonId = submission.LessonId.Value,
                            Status = isPassed ? LessonProgressStatus.COMPLETED : LessonProgressStatus.IN_PROGRESS,
                            IsCompleted = isPassed,
                            CompletedAt = isPassed ? DateTime.UtcNow : null,
                            LastPositionSeconds = 0,
                            TimeSpentSeconds = 0,
                            TimeSpentMinutes = 0,
                            LastAccessedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        await _lessonProgressRepository.AddAsync(progress);
                    }
                    // Nhánh 5.2: Đã có bản ghi tiến độ -> Cập nhật trạng thái IsCompleted và Status
                    else
                    {
                        progress.IsCompleted = isPassed;
                        progress.Status = isPassed ? LessonProgressStatus.COMPLETED : LessonProgressStatus.IN_PROGRESS;
                        progress.CompletedAt = isPassed ? (progress.CompletedAt ?? DateTime.UtcNow) : null;
                        progress.UpdatedAt = DateTime.UtcNow;
                        _lessonProgressRepository.Update(progress);
                    }
                }
            }

            // [BƯỚC 6]: Lưu toàn bộ thay đổi vào CSDL
            await _unitOfWork.SaveChangesAsync();

            // [BƯỚC 7]: Ánh xạ kết quả sang DTO
            return MapToResponseDto(submission);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GradeSubmissionAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

    /// <summary>
    /// Ánh xạ thực thể SpeakingSubmission sang SpeakingSubmissionResponseDto.
    /// </summary>
    private static SpeakingSubmissionResponseDto MapToResponseDto(SpeakingSubmission submission)
    {
        var script = submission.SpeakingScript ?? submission.Lesson?.SpeakingScript;
        var lesson = submission.Lesson;
        var course = script?.Course ?? lesson?.Course;
        var module = script?.Module ?? lesson?.Module;
        var learner = submission.Learner;
        var instructor = course?.Instructor;
        var gradedBy = submission.GradedBy;

        var title = !string.IsNullOrWhiteSpace(script?.Title)
            ? script.Title
            : (!string.IsNullOrWhiteSpace(lesson?.Title) ? lesson.Title : "Bài tập nói");

        var scope = script?.Scope.ToString() ?? "FINAL";

        return new SpeakingSubmissionResponseDto
        {
            SubmissionId = submission.SubmissionId,
            ScriptId = submission.ScriptId ?? script?.ScriptId,
            ScriptTitle = title,
            Scope = scope,
            LessonId = submission.LessonId,
            LessonTitle = title,
            CourseId = course?.CourseId ?? 0,
            CourseTitle = course?.Title ?? string.Empty,
            CourseSlug = course?.Slug,
            ModuleId = module?.ModuleId,
            ModuleTitle = module?.Title,
            LearnerId = submission.LearnerId,
            LearnerName = learner?.FullName ?? string.Empty,
            LearnerEmail = learner?.Email ?? string.Empty,
            InstructorId = instructor?.UserId ?? 0,
            InstructorName = instructor?.FullName ?? string.Empty,
            AudioUrl = submission.AudioUrl,
            Note = submission.Note,
            Status = submission.Status.ToString(),
            Score = submission.Score,
            Feedback = submission.Feedback,
            GradedById = submission.GradedById,
            GradedByName = gradedBy?.FullName,
            GradedAt = submission.GradedAt,
            SubmittedAt = submission.SubmittedAt,
            UpdatedAt = submission.UpdatedAt
        };
    }
}
