
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using EnrollmentEntity = global::MC_BE.Core.Entities.Enrollment;

namespace MC_BE.Features.Learning.Services;

public class SpeakingSubmissionService : ISpeakingSubmissionService
{
    private readonly ISpeakingSubmissionRepository _submissionRepository;
    private readonly ISpeakingScriptRepository _scriptRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<EnrollmentEntity> _enrollmentRepository;
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
        IGenericRepository<EnrollmentEntity> enrollmentRepository,
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
                if (script.LessonId.HasValue)
                {
                    lessonId = script.LessonId.Value;
                }
                else if (lessonId.HasValue)
                {
                    var reqLesson = await _lessonRepository.GetByIdAsync(lessonId.Value);
                    if (reqLesson != null && reqLesson.CourseId == courseId && reqLesson.LessonType == LessonType.ASSIGNMENT)
                    {
                        lesson = reqLesson;
                    }
                    else if (script.Scope == SpeakingScope.FINAL || script.Scope == SpeakingScope.CHAPTER)
                    {
                        lessonId = null;
                    }
                }
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

            // Validate điều kiện hoàn thành video bài học theo SpeakingScope và loại bài học
            var scope = script?.Scope ?? (lesson != null && lesson.LessonType == LessonType.ASSIGNMENT ? SpeakingScope.FINAL : SpeakingScope.LESSON);

            if (scope == SpeakingScope.FINAL)
            {
                // Cấp Final: Kiểm tra đã hoàn thành toàn bộ các bài học video của khóa học
                // KHÔNG kiểm tra điều kiện "đã xem video của lessonId hiện tại"
                var allLessons = await _lessonRepository.GetQueryable().AsNoTracking()
                    .Include(l => l.CourseMaterials)
                    .Where(l => l.CourseId == courseId &&
                                l.Status == LessonStatus.ACTIVE &&
                                !l.IsRemedial &&
                                l.LessonType != LessonType.ASSIGNMENT &&
                                (!lessonId.HasValue || l.LessonId != lessonId.Value))
                    .ToListAsync();

                var videoLessons = allLessons
                    .Where(l => l.CourseMaterials.Any(m => m.MaterialType == MaterialType.VIDEO &&
                        ((!string.IsNullOrEmpty(m.ObjectKey)) || (!string.IsNullOrEmpty(m.FileUrl)))) ||
                        l.LessonType == LessonType.VIDEO)
                    .Select(l => l.LessonId)
                    .ToList();

                if (videoLessons.Count > 0)
                {
                    var completedVideoLessonIds = await _lessonProgressRepository.GetQueryable().AsNoTracking()
                        .Where(p => p.Enrollment.LearnerId == learnerId &&
                                    p.Enrollment.CourseId == courseId &&
                                    videoLessons.Contains(p.LessonId) &&
                                    (p.IsCompleted || p.Status == LessonProgressStatus.COMPLETED))
                        .Select(p => p.LessonId)
                        .Distinct()
                        .ToListAsync();

                    if (completedVideoLessonIds.Count < videoLessons.Count)
                    {
                        var msg = "Vui lòng hoàn thành toàn bộ video bài học trước khi nộp bài thi nói cuối khóa.";
                        _logger.LogWarning("Learner {LearnerId} attempted final speaking submission before completing all course videos for Course {CourseId}", learnerId, courseId);
                        throw new InvalidOperationException(msg);
                    }
                }
            }
            else if (scope == SpeakingScope.CHAPTER)
            {
                // Cấp Chapter: Kiểm tra đã hoàn thành các bài video trong chương đó
                var targetModuleId = script?.ModuleId ?? lesson?.ModuleId;
                if (targetModuleId.HasValue && targetModuleId.Value > 0)
                {
                    var chapterLessons = await _lessonRepository.GetQueryable().AsNoTracking()
                        .Include(l => l.CourseMaterials)
                        .Where(l => l.ModuleId == targetModuleId.Value &&
                                    l.Status == LessonStatus.ACTIVE &&
                                    !l.IsRemedial &&
                                    l.LessonType != LessonType.ASSIGNMENT &&
                                    (!lessonId.HasValue || l.LessonId != lessonId.Value))
                        .ToListAsync();

                    var chapterVideoLessons = chapterLessons
                        .Where(l => l.CourseMaterials.Any(m => m.MaterialType == MaterialType.VIDEO &&
                            ((!string.IsNullOrEmpty(m.ObjectKey)) || (!string.IsNullOrEmpty(m.FileUrl)))) ||
                            l.LessonType == LessonType.VIDEO)
                        .Select(l => l.LessonId)
                        .ToList();

                    if (chapterVideoLessons.Count > 0)
                    {
                        var completedChapterVideoIds = await _lessonProgressRepository.GetQueryable().AsNoTracking()
                            .Where(p => p.Enrollment.LearnerId == learnerId &&
                                        p.Enrollment.CourseId == courseId &&
                                        chapterVideoLessons.Contains(p.LessonId) &&
                                        (p.IsCompleted || p.Status == LessonProgressStatus.COMPLETED))
                            .Select(p => p.LessonId)
                            .Distinct()
                            .ToListAsync();

                        if (completedChapterVideoIds.Count < chapterVideoLessons.Count)
                        {
                            var msg = "Vui lòng hoàn thành tất cả video bài học trong chương trước khi nộp bài luyện nói.";
                            _logger.LogWarning("Learner {LearnerId} attempted chapter speaking submission before completing chapter videos for Module {ModuleId}", learnerId, targetModuleId.Value);
                            throw new InvalidOperationException(msg);
                        }
                    }
                }
            }
            else
            {
                // Cấp Lesson: Chỉ kiểm tra nếu bài học gắn kèm CÓ VIDEO
                if (lessonId.HasValue && lessonId.Value > 0)
                {
                    if (lesson == null)
                    {
                        lesson = await _lessonRepository.GetQueryable().AsNoTracking()
                            .Include(l => l.CourseMaterials)
                            .FirstOrDefaultAsync(l => l.LessonId == lessonId.Value);
                    }

                    bool hasVideo = lesson != null &&
                        lesson.LessonType != LessonType.ASSIGNMENT &&
                        (lesson.CourseMaterials.Any(m => m.MaterialType == MaterialType.VIDEO &&
                            ((!string.IsNullOrEmpty(m.ObjectKey)) || (!string.IsNullOrEmpty(m.FileUrl)))) ||
                         lesson.LessonType == LessonType.VIDEO);

                    if (hasVideo)
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
                }
            }

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
                (await _submissionRepository.FindAsync(s => s.LearnerId == learnerId && s.ScriptId == script.ScriptId && s.Status == SpeakingSubmissionStatus.GRADED && s.Score >= 80)).Any();
            if (hasPassedOfficialSubmission)
                throw new InvalidOperationException("Bạn đã đạt bài Speaking này; không cần làm bài bổ trợ hoặc nộp lại.");

            if (existingSubmission != null)
            {

                if (existingSubmission.Score == null || existingSubmission.Status == SpeakingSubmissionStatus.SUBMITTED)
                {
                    var errMsg = "Bài nộp của bạn đang chờ giảng viên chấm, không thể nộp lại lúc này.";
                    _logger.LogWarning("Duplicate speaking submission attempt: Learner {LearnerId} on Script {ScriptId} / Lesson {LessonId}", learnerId, scriptId, lessonId);
                    throw new InvalidOperationException(errMsg);
                }

                if (existingSubmission.Status == SpeakingSubmissionStatus.GRADED && existingSubmission.Score >= 80 && script?.IsRemedial != true)
                {
                    var errMsg = "Bạn đã đạt yêu cầu bài thi nói này (≥ 80 điểm và không có tiêu chí điểm liệt), không cần nộp lại.";
                    _logger.LogWarning("Learner {LearnerId} already passed Script {ScriptId} / Lesson {LessonId} with score {Score}", learnerId, scriptId, lessonId, existingSubmission.Score);
                    throw new InvalidOperationException(errMsg);
                }

            }

            var uploadResult = await _cloudinaryService.UploadVideoAsync(request.AudioFile, "speaking_submissions");
            if (uploadResult == null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
            {
                var errMsg = "Error: Failed to upload audio file to Cloudinary.";
                _logger.LogError(errMsg);
                throw new InvalidOperationException("Failed to upload audio file to storage.");
            }

            var audioUrl = uploadResult.SecureUrl.ToString();

            var rawNote = request.Note?.Trim() ?? string.Empty;
            string? encodedNote = rawNote;
            if (!string.IsNullOrWhiteSpace(request.SelectedLevel))
            {
                var cleanLevel = request.SelectedLevel.Trim().ToUpperInvariant();
                encodedNote = $"[LEVEL:{cleanLevel}]{(string.IsNullOrWhiteSpace(rawNote) ? "" : " " + rawNote)}";
            }
            else if (script?.Levels != null && script.Levels.Count > 0)
            {

                encodedNote = $"[LEVEL:BEGINNER]{(string.IsNullOrWhiteSpace(rawNote) ? "" : " " + rawNote)}";
            }

            var studentNote = !string.IsNullOrWhiteSpace(request.StudentNote)
                ? request.StudentNote.Trim()
                : (!string.IsNullOrWhiteSpace(rawNote) ? rawNote : null);

            var submission = new SpeakingSubmission
            {
                ScriptId = scriptId,
                LessonId = lessonId,
                LearnerId = learnerId,
                AudioUrl = audioUrl,
                Note = encodedNote,
                StudentNote = studentNote,
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
            return submissions.Select(s => MapToResponseDto(s));
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
            return submissions.Select(s => MapToResponseDto(s));
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
            return filtered.Select(s => MapToResponseDto(s));
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

            var hasZeroCriterion = request.CriterionScores != null && request.CriterionScores.Count > 0 && request.CriterionScores.Any(c => c.Score <= 0);
            var isPassed = request.Score >= 80 && !hasZeroCriterion;

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

                bool hasZeroCriterion = false;
                if (!string.IsNullOrWhiteSpace(s.Feedback))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(s.Feedback, @"<!--RUBRIC_SCORES:(.*?)-->", System.Text.RegularExpressions.RegexOptions.Singleline);
                    if (match.Success)
                    {
                        try
                        {
                            var json = match.Groups[1].Value;
                            var parsed = System.Text.Json.JsonSerializer.Deserialize<List<SubmissionCriterionScoreDto>>(json,
                                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null && parsed.Any(c => c.Score <= 0))
                            {
                                hasZeroCriterion = true;
                            }
                        }
                        catch { }
                    }
                }

                bool? isPassed = s.Score.HasValue
                    ? (s.Status != SpeakingSubmissionStatus.NEEDS_RESUBMISSION && s.Score.Value >= 80 && !hasZeroCriterion)
                    : null;

                string? gradeTier = null;
                if (s.Score.HasValue)
                {
                    if (isPassed == false)
                    {
                        gradeTier = hasZeroCriterion ? "Chưa đạt (Điểm liệt tiêu chí)" : SpeakingSubmissionResponseDto.GetGradeTier(s.Score.Value);
                    }
                    else
                    {
                        gradeTier = SpeakingSubmissionResponseDto.GetGradeTier(s.Score.Value);
                    }
                }

                var rawCleanNote = !string.IsNullOrWhiteSpace(s.Note)
                    ? System.Text.RegularExpressions.Regex.Replace(s.Note, @"\[LEVEL:([A-Za-z]+)\]", "").Trim()
                    : null;
                var effectiveStudentNote = s.StudentNote ?? (string.IsNullOrEmpty(rawCleanNote) ? null : rawCleanNote);

                return new SpeakingSubmissionHistoryDto
                {
                    SubmissionId = s.SubmissionId,
                    ScriptId = s.ScriptId,
                    LessonId = s.LessonId,
                    AttemptNumber = index + 1,
                    Score = s.Score,
                    Status = isPassed == false ? SpeakingSubmissionStatus.NEEDS_RESUBMISSION.ToString() : s.Status.ToString(),
                    IsPassed = isPassed,
                    GradeTier = gradeTier,
                    SubmittedAt = s.SubmittedAt,
                    GradedAt = s.GradedAt,
                    AudioUrl = s.AudioUrl,
                    StudentNote = effectiveStudentNote,
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

                bool hasZeroCriterion = false;
                if (!string.IsNullOrWhiteSpace(s.Feedback))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(s.Feedback, @"<!--RUBRIC_SCORES:(.*?)-->", System.Text.RegularExpressions.RegexOptions.Singleline);
                    if (match.Success)
                    {
                        try
                        {
                            var json = match.Groups[1].Value;
                            var parsed = System.Text.Json.JsonSerializer.Deserialize<List<SubmissionCriterionScoreDto>>(json,
                                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null && parsed.Any(c => c.Score <= 0))
                            {
                                hasZeroCriterion = true;
                            }
                        }
                        catch { }
                    }
                }

                bool? isPassed = s.Score.HasValue
                    ? (s.Status != SpeakingSubmissionStatus.NEEDS_RESUBMISSION && s.Score.Value >= 80 && !hasZeroCriterion)
                    : null;

                string? gradeTier = null;
                if (s.Score.HasValue)
                {
                    if (isPassed == false)
                    {
                        gradeTier = hasZeroCriterion ? "Chưa đạt (Điểm liệt tiêu chí)" : SpeakingSubmissionResponseDto.GetGradeTier(s.Score.Value);
                    }
                    else
                    {
                        gradeTier = SpeakingSubmissionResponseDto.GetGradeTier(s.Score.Value);
                    }
                }

                var rawCleanNote = !string.IsNullOrWhiteSpace(s.Note)
                    ? System.Text.RegularExpressions.Regex.Replace(s.Note, @"\[LEVEL:([A-Za-z]+)\]", "").Trim()
                    : null;
                var effectiveStudentNote = s.StudentNote ?? (string.IsNullOrEmpty(rawCleanNote) ? null : rawCleanNote);

                return new SpeakingSubmissionHistoryDto
                {
                    SubmissionId = s.SubmissionId,
                    ScriptId = s.ScriptId,
                    LessonId = s.LessonId,
                    AttemptNumber = index + 1,
                    Score = s.Score,
                    Status = isPassed == false ? SpeakingSubmissionStatus.NEEDS_RESUBMISSION.ToString() : s.Status.ToString(),
                    IsPassed = isPassed,
                    GradeTier = gradeTier,
                    SubmittedAt = s.SubmittedAt,
                    GradedAt = s.GradedAt,
                    AudioUrl = s.AudioUrl,
                    StudentNote = effectiveStudentNote,
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
            StudentNote = submission.StudentNote ?? cleanNote,
            SelectedLevel = selectedLevel,
            AttemptNumber = attemptNumber,
            TotalAttempts = totalAttempts,
            PassingScore = passingScore,
            Status = (criterionScores.Any(c => c.Score <= 0) && submission.Score.HasValue)
                ? SpeakingSubmissionStatus.NEEDS_RESUBMISSION.ToString()
                : submission.Status.ToString(),
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

    private static readonly List<SpeakingRubricCriterionDto> DefaultRubricCriteria = new()
    {
        new SpeakingRubricCriterionDto { CriterionId = 1, Code = "C01", Name = "Phát âm & thanh điệu", WeightPercentage = 18m, IsMandatory = true, OrderIndex = 1 },
        new SpeakingRubricCriterionDto { CriterionId = 2, Code = "C02", Name = "Độ rõ lời", WeightPercentage = 10m, IsMandatory = true, OrderIndex = 2 },
        new SpeakingRubricCriterionDto { CriterionId = 3, Code = "C03", Name = "Độ chính xác nội dung", WeightPercentage = 7m, IsMandatory = true, OrderIndex = 3 },
    };
}
