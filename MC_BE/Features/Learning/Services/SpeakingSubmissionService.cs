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

    public async Task<SpeakingSubmissionResponseDto> SubmitSpeakingAssignmentAsync(int learnerId, CreateSpeakingSubmissionRequest request)
    {
        try
        {
            // 1. Validate file existence and extension (.mp3, .wav)
            if (request.AudioFile == null || request.AudioFile.Length == 0)
            {
                var errMsg = "Error: Audio file is empty or missing.";
                _logger.LogError(errMsg);
                throw new ArgumentException("Audio file is required.");
            }

            var extension = Path.GetExtension(request.AudioFile.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac" };
            if (!allowedExtensions.Contains(extension))
            {
                var errMsg = $"Error: Invalid audio file format '{extension}'. Only .mp3 and .wav files are allowed.";
                _logger.LogError(errMsg);
                throw new ArgumentException("Invalid audio file format. Only .mp3 and .wav formats are allowed.");
            }

            int courseId = 0;
            int? scriptId = request.ScriptId;
            int? lessonId = request.LessonId;
            SpeakingScript? script = null;
            Lesson? lesson = null;

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
            else
            {
                throw new ArgumentException("Vui lòng cung cấp LessonId hoặc ScriptId để nộp bài nói.");
            }

            if (courseId <= 0 || !await _courseAccess.CanAccessCourseAsync(courseId, learnerId, isAdmin: false))
                throw new InvalidOperationException("Bạn không có quyền truy cập khóa học này.");

            if (script?.IsRemedial == true &&
                (!await _remedialAssignments.CanAccessContentAsync(learnerId, "SPEAKING", script.ScriptId) ||
                 !await _remedialAssignments.CanStartAttemptAsync(learnerId, "SPEAKING", script.ScriptId)))
                throw new InvalidOperationException("Bài bổ trợ đã hết lượt, đã hoàn thành hoặc khóa học hiện không còn quyền truy cập.");

            // Check if learner has already submitted
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
            var hasPassedOfficialSubmission = script != null && !script.IsRemedial &&
                (await _submissionRepository.FindAsync(s => s.LearnerId == learnerId && s.ScriptId == script.ScriptId && s.Score >= 80)).Any();
            if (hasPassedOfficialSubmission && !hasOfficialRetake)
                throw new InvalidOperationException("Bạn đã đạt bài Speaking này. Giảng viên cần mở lượt làm lại thông qua bài bổ trợ.");

            if (existingSubmission != null)
            {
                if (existingSubmission.Score == null || existingSubmission.Status == SpeakingSubmissionStatus.SUBMITTED)
                {
                    var errMsg = "Bài nộp của bạn đang chờ giảng viên chấm, không thể nộp lại lúc này.";
                    _logger.LogWarning("Duplicate speaking submission attempt: Learner {LearnerId} on Script {ScriptId} / Lesson {LessonId}", learnerId, scriptId, lessonId);
                    throw new InvalidOperationException(errMsg);
                }

                if (existingSubmission.Score >= 80 && !hasOfficialRetake)
                {
                    var errMsg = "Bạn đã đạt yêu cầu bài thi nói này (≥ 80 điểm), không cần nộp lại.";
                    _logger.LogWarning("Learner {LearnerId} already passed Script {ScriptId} / Lesson {LessonId} with score {Score}", learnerId, scriptId, lessonId, existingSubmission.Score);
                    throw new InvalidOperationException(errMsg);
                }
            }

            // 4. Upload audio to Cloudinary
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

            await _unitOfWork.SaveChangesAsync();
            if (script?.IsRemedial == true)
                await _remedialAssignments.RecordAttemptResultAsync(learnerId, "SPEAKING", script.ScriptId, passed: false);
            else if (hasOfficialRetake && script != null)
                await _remedialAssignments.ConsumeSpeakingRetakeGrantAsync(learnerId, script.ScriptId);

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

    public async Task<SpeakingSubmissionResponseDto?> GradeSubmissionAsync(int instructorId, int submissionId, GradeSpeakingSubmissionRequest request)
    {
        try
        {
            if (request.Score < 0 || request.Score > 100)
            {
                throw new ArgumentException("Score must be between 0 and 100.");
            }

            var submission = await _submissionRepository.GetByIdWithDetailsAsync(submissionId);
            if (submission == null)
            {
                return null;
            }

            var courseInstructorId = submission.Lesson?.Course?.InstructorId
                ?? submission.SpeakingScript?.Course?.InstructorId;

            if (courseInstructorId != instructorId)
            {
                throw new UnauthorizedAccessException("You are not authorized to grade this submission.");
            }

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

            await _unitOfWork.SaveChangesAsync();

            return MapToResponseDto(submission);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GradeSubmissionAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            throw;
        }
    }

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
