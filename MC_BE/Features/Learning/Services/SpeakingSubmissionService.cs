
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
            // [BƯỚC 1]: KIỂM TRA HỢP LỆ CỦA FILE ÂM THANH ĐẦU VÀO
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
            // [BƯỚC 2]: PHÂN GIẢI NGỮ CẢNH BÀI TẬP (COURSE, SCRIPT, LESSON RESOLUTION)
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
            // [BƯỚC 3]: XÁC MINH QUYỀN TRUY CẬP VÀ GHI DANH KHÓA HỌC
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

            // [BƯỚC 3.1]: KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT HOÀN THÀNH VIDEO BÀI HỌC
            // Bài luyện nói theo bài học (LESSON) bắt buộc học viên phải hoàn thành video của bài học đó trước khi nộp bài
            if (lessonId.HasValue && lessonId.Value > 0)
            {
                var lessonProgresses = await _lessonProgressRepository.FindAsync(
                    p => p.LessonId == lessonId.Value &&
                         p.Enrollment.LearnerId == learnerId &&
                         p.Enrollment.CourseId == courseId);
                var progress = lessonProgresses.FirstOrDefault();
                var isCompleted = progress != null && (progress.IsCompleted || progress.Status == LessonProgressStatus.COMPLETED);

                if (!isCompleted)
                {
                    var msg = "Vui lòng hoàn thành video bài học trước khi nộp bài luyện nói.";
                    _logger.LogWarning("Learner {LearnerId} attempted speaking submission before completing lesson video {LessonId}", learnerId, lessonId.Value);
                    throw new InvalidOperationException(msg);
                }
            }
            // [BƯỚC 4]: QUY CHẾ KHÓA NỘP BÀI (RESUBMISSION LOCK BUSINESS RULES)
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
            // [BƯỚC 5]: TẢI TẬP TIN GHI ÂM LÊN ĐÁM MÂY CLOUDINARY
            var uploadResult = await _cloudinaryService.UploadVideoAsync(request.AudioFile, "speaking_submissions");
            if (uploadResult == null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
            {
                var errMsg = "Error: Failed to upload audio file to Cloudinary.";
                _logger.LogError(errMsg);
                throw new InvalidOperationException("Failed to upload audio file to storage.");
            }

            var audioUrl = uploadResult.SecureUrl.ToString();

            // Đóng gói cấp độ đã chọn vào Note nếu có
            var rawNote = request.Note?.Trim() ?? string.Empty;
            string? encodedNote = rawNote;
            if (!string.IsNullOrWhiteSpace(request.SelectedLevel))
            {
                var cleanLevel = request.SelectedLevel.Trim().ToUpperInvariant();
                encodedNote = $"[LEVEL:{cleanLevel}]{(string.IsNullOrWhiteSpace(rawNote) ? "" : " " + rawNote)}";
            }
            else if (script?.Levels != null && script.Levels.Count > 0)
            {
                // Mặc định level đầu tiên nếu không chỉ định
                encodedNote = $"[LEVEL:BEGINNER]{(string.IsNullOrWhiteSpace(rawNote) ? "" : " " + rawNote)}";
            }

            var submission = new SpeakingSubmission
            {
                ScriptId = scriptId,
                LessonId = lessonId,
                LearnerId = learnerId,
                AudioUrl = audioUrl,
                Note = encodedNote,
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

            // Tính số lần làm
            int attemptNumber = 1;
            int totalAttempts = 1;
            if (scriptId.HasValue)
            {
                var allAttempts = (await _submissionRepository.GetSubmissionsByLearnerAndScriptAsync(learnerId, scriptId.Value)).ToList();
                totalAttempts = allAttempts.Count;
                var idx = allAttempts.FindIndex(s => s.SubmissionId == submission.SubmissionId);
                attemptNumber = idx >= 0 ? idx + 1 : totalAttempts;
            }
            else if (lessonId.HasValue)
            {
                var allAttempts = (await _submissionRepository.GetSubmissionsByLearnerAndLessonAsync(learnerId, lessonId.Value)).ToList();
                totalAttempts = allAttempts.Count;
                var idx = allAttempts.FindIndex(s => s.SubmissionId == submission.SubmissionId);
                attemptNumber = idx >= 0 ? idx + 1 : totalAttempts;
            }

            return MapToResponseDto(fullSubmission ?? submission, attemptNumber, totalAttempts);
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
            return submissions.Select(s => MapToResponseDto(s));
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
            return submissions.Select(s => MapToResponseDto(s));
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
            return filtered.Select(s => MapToResponseDto(s));
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GetSubmissionsByCourseForInstructorAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

    /// <summary>
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

            // Đóng gói CriterionScores vào Feedback nếu có
            var cleanFeedback = request.Feedback?.Trim() ?? string.Empty;
            string finalFeedback = cleanFeedback;
            if (request.CriterionScores != null && request.CriterionScores.Count > 0)
            {
                var rubricJson = System.Text.Json.JsonSerializer.Serialize(request.CriterionScores);
                finalFeedback = $"{cleanFeedback}\n<!--RUBRIC_SCORES:{rubricJson}-->";
            }

            submission.Score = request.Score;
            submission.Feedback = finalFeedback;
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
    /// Lấy chi tiết bài nộp theo ID cho học viên (chính chủ) hoặc giảng viên/admin.
    /// </summary>
    public async Task<SpeakingSubmissionResponseDto?> GetSubmissionByIdAsync(int submissionId, int userId, bool isInstructorOrAdmin)
    {
        try
        {
            var submission = await _submissionRepository.GetByIdWithDetailsAsync(submissionId);
            if (submission == null) return null;

            if (submission.LearnerId != userId && !isInstructorOrAdmin)
            {
                var courseInstructorId = submission.Lesson?.Course?.InstructorId
                    ?? submission.SpeakingScript?.Course?.InstructorId;
                if (courseInstructorId != userId)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền xem chi tiết bài nộp này.");
                }
            }

            int attemptNumber = 1;
            int totalAttempts = 1;
            if (submission.ScriptId.HasValue)
            {
                var all = (await _submissionRepository.GetSubmissionsByLearnerAndScriptAsync(submission.LearnerId, submission.ScriptId.Value)).ToList();
                totalAttempts = all.Count > 0 ? all.Count : 1;
                var idx = all.FindIndex(s => s.SubmissionId == submissionId);
                attemptNumber = idx >= 0 ? idx + 1 : totalAttempts;
            }
            else if (submission.LessonId.HasValue)
            {
                var all = (await _submissionRepository.GetSubmissionsByLearnerAndLessonAsync(submission.LearnerId, submission.LessonId.Value)).ToList();
                totalAttempts = all.Count > 0 ? all.Count : 1;
                var idx = all.FindIndex(s => s.SubmissionId == submissionId);
                attemptNumber = idx >= 0 ? idx + 1 : totalAttempts;
            }

            return MapToResponseDto(submission, attemptNumber, totalAttempts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSubmissionByIdAsync: {Message}", ex.Message);
            throw;
        }
    }

    /// <summary>
    /// Lấy toàn bộ lịch sử các lần nộp bài của học viên cho một kịch bản nói.
    /// </summary>
    public async Task<IEnumerable<SpeakingSubmissionHistoryDto>> GetSubmissionHistoryByScriptAsync(int learnerId, int scriptId)
    {
        try
        {
            var subs = (await _submissionRepository.GetSubmissionsByLearnerAndScriptAsync(learnerId, scriptId)).ToList();
            return subs.Select((s, index) =>
            {
                string? level = null;
                if (!string.IsNullOrWhiteSpace(s.Note))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(s.Note, @"\[LEVEL:([A-Za-z]+)\]");
                    if (match.Success) level = match.Groups[1].Value.ToUpperInvariant();
                }

                return new SpeakingSubmissionHistoryDto
                {
                    SubmissionId = s.SubmissionId,
                    ScriptId = s.ScriptId,
                    LessonId = s.LessonId,
                    AttemptNumber = index + 1,
                    Score = s.Score,
                    Status = s.Status.ToString(),
                    SubmittedAt = s.SubmittedAt,
                    GradedAt = s.GradedAt,
                    AudioUrl = s.AudioUrl,
                    SelectedLevel = level
                };
            }).OrderByDescending(h => h.AttemptNumber).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSubmissionHistoryByScriptAsync for Learner {LearnerId} Script {ScriptId}", learnerId, scriptId);
            throw;
        }
    }

    /// <summary>
    /// Lấy toàn bộ lịch sử các lần nộp bài của học viên cho một bài học.
    /// </summary>
    public async Task<IEnumerable<SpeakingSubmissionHistoryDto>> GetSubmissionHistoryByLessonAsync(int learnerId, int lessonId)
    {
        try
        {
            var subs = (await _submissionRepository.GetSubmissionsByLearnerAndLessonAsync(learnerId, lessonId)).ToList();
            return subs.Select((s, index) =>
            {
                string? level = null;
                if (!string.IsNullOrWhiteSpace(s.Note))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(s.Note, @"\[LEVEL:([A-Za-z]+)\]");
                    if (match.Success) level = match.Groups[1].Value.ToUpperInvariant();
                }

                return new SpeakingSubmissionHistoryDto
                {
                    SubmissionId = s.SubmissionId,
                    ScriptId = s.ScriptId,
                    LessonId = s.LessonId,
                    AttemptNumber = index + 1,
                    Score = s.Score,
                    Status = s.Status.ToString(),
                    SubmittedAt = s.SubmittedAt,
                    GradedAt = s.GradedAt,
                    AudioUrl = s.AudioUrl,
                    SelectedLevel = level
                };
            }).OrderByDescending(h => h.AttemptNumber).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetSubmissionHistoryByLessonAsync for Learner {LearnerId} Lesson {LessonId}", learnerId, lessonId);
            throw;
        }
    }

    /// <summary>
    /// Ánh xạ thực thể SpeakingSubmission sang SpeakingSubmissionResponseDto.
    /// </summary>
    private static SpeakingSubmissionResponseDto MapToResponseDto(SpeakingSubmission submission, int attemptNumber = 1, int totalAttempts = 1)
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

        var criteria = (script?.RubricCriteria != null && script.RubricCriteria.Count > 0)
            ? script.RubricCriteria.Select(r => new SpeakingRubricCriterionDto
            {
                CriterionId = r.CriterionId,
                ScriptId = r.ScriptId,
                Code = r.Code,
                Name = r.Name,
                WeightPercentage = r.WeightPercentage,
                IsMandatory = r.IsMandatory,
                OrderIndex = r.OrderIndex,
                UpdatedAt = r.UpdatedAt
            }).OrderBy(r => r.OrderIndex).ThenBy(r => r.Code).ToList()
            : DefaultRubricCriteria;

        // Phân tách SelectedLevel từ Note nếu có
        string? selectedLevel = null;
        string? cleanNote = submission.Note;
        if (!string.IsNullOrWhiteSpace(submission.Note))
        {
            var match = System.Text.RegularExpressions.Regex.Match(submission.Note, @"\[LEVEL:([A-Za-z]+)\]");
            if (match.Success)
            {
                selectedLevel = match.Groups[1].Value.ToUpperInvariant();
                cleanNote = submission.Note.Replace(match.Value, "").Trim();
                if (string.IsNullOrEmpty(cleanNote)) cleanNote = null;
            }
        }

        // Phân tách CriterionScores từ Feedback nếu có
        string? cleanFeedback = submission.Feedback;
        List<SubmissionCriterionScoreDto> criterionScores = new();
        if (!string.IsNullOrWhiteSpace(submission.Feedback))
        {
            var match = System.Text.RegularExpressions.Regex.Match(submission.Feedback, @"<!--RUBRIC_SCORES:(.*?)-->", System.Text.RegularExpressions.RegexOptions.Singleline);
            if (match.Success)
            {
                try
                {
                    var json = match.Groups[1].Value;
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<List<SubmissionCriterionScoreDto>>(json,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (parsed != null && parsed.Count > 0)
                    {
                        criterionScores = parsed;
                    }
                }
                catch { }

                cleanFeedback = submission.Feedback.Replace(match.Value, "").Trim();
                if (string.IsNullOrEmpty(cleanFeedback)) cleanFeedback = null;
            }
        }

        // Nếu đã có điểm nhưng chưa có điểm chi tiết cho từng tiêu chí, tạo tự động từ điểm tổng
        if (criterionScores.Count == 0 && submission.Score.HasValue && criteria.Count > 0)
        {
            criterionScores = criteria.Select(c => new SubmissionCriterionScoreDto
            {
                Code = c.Code,
                Name = c.Name,
                WeightPercentage = c.WeightPercentage,
                Score = submission.Score.Value,
                Feedback = null
            }).ToList();
        }

        var passingScore = script?.PassingScore ?? 80m;

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
            Note = cleanNote,
            SelectedLevel = selectedLevel,
            AttemptNumber = attemptNumber,
            TotalAttempts = totalAttempts,
            PassingScore = passingScore,
            Status = submission.Status.ToString(),
            Score = submission.Score,
            Feedback = cleanFeedback,
            GradedById = submission.GradedById,
            GradedByName = gradedBy?.FullName,
            GradedAt = submission.GradedAt,
            SubmittedAt = submission.SubmittedAt,
            UpdatedAt = submission.UpdatedAt,
            RubricCriteria = criteria,
            CriterionScores = criterionScores
        };
    }

    /// <summary>
    /// Tiêu chí chấm điểm mặc định nếu kịch bản chưa cấu hình tiêu chí riêng.
    /// </summary>
    private static readonly List<SpeakingRubricCriterionDto> DefaultRubricCriteria = new()
    {
        new SpeakingRubricCriterionDto { CriterionId = 1, Code = "C01", Name = "Phát âm & thanh điệu", WeightPercentage = 18m, IsMandatory = true, OrderIndex = 1 },
        new SpeakingRubricCriterionDto { CriterionId = 2, Code = "C02", Name = "Độ rõ lời", WeightPercentage = 10m, IsMandatory = true, OrderIndex = 2 },
        new SpeakingRubricCriterionDto { CriterionId = 3, Code = "C03", Name = "Độ chính xác nội dung", WeightPercentage = 7m, IsMandatory = true, OrderIndex = 3 },
    };
}
