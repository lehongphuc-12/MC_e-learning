using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Services;

public class SpeakingSubmissionService : ISpeakingSubmissionService
{
    private readonly ISpeakingSubmissionRepository _submissionRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SpeakingSubmissionService> _logger;

    public SpeakingSubmissionService(
        ISpeakingSubmissionRepository submissionRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        ICloudinaryService cloudinaryService,
        IUnitOfWork unitOfWork,
        ILogger<SpeakingSubmissionService> logger)
    {
        _submissionRepository = submissionRepository;
        _lessonRepository = lessonRepository;
        _enrollmentRepository = enrollmentRepository;
        _cloudinaryService = cloudinaryService;
        _unitOfWork = unitOfWork;
        _logger = logger;
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
                Console.WriteLine(errMsg);
                throw new ArgumentException("Audio file is required.");
            }

            var extension = Path.GetExtension(request.AudioFile.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac" };
            if (!allowedExtensions.Contains(extension))
            {
                var errMsg = $"Error: Invalid audio file format '{extension}'. Only .mp3 and .wav files are allowed.";
                _logger.LogError(errMsg);
                Console.WriteLine(errMsg);
                throw new ArgumentException("Invalid audio file format. Only .mp3 and .wav formats are allowed.");
            }

            // 2. Validate Lesson existence via Repository
            var lessons = await _lessonRepository.FindAsync(
                l => l.LessonId == request.LessonId,
                l => l.Course);
            var lesson = lessons.FirstOrDefault();

            if (lesson == null)
            {
                var errMsg = $"Error: Lesson with ID {request.LessonId} not found.";
                _logger.LogError(errMsg);
                Console.WriteLine(errMsg);
                throw new KeyNotFoundException($"Lesson with ID {request.LessonId} was not found.");
            }

            // 3. Check learner enrollment in the course via Repository
            var enrollments = await _enrollmentRepository.FindAsync(
                e => e.LearnerId == learnerId && e.CourseId == lesson.CourseId);
            if (!enrollments.Any())
            {
                var errMsg = $"Error: Learner ID {learnerId} is not enrolled in Course ID {lesson.CourseId}.";
                _logger.LogError(errMsg);
                Console.WriteLine(errMsg);
                throw new InvalidOperationException("You must be enrolled in this course to submit assignments.");
            }

            // 4. Upload audio to Cloudinary
            _logger.LogInformation("Uploading speaking audio for Learner {LearnerId} on Lesson {LessonId} to Cloudinary...", learnerId, request.LessonId);
            Console.WriteLine($"Uploading speaking audio for Learner {learnerId} on Lesson {request.LessonId} to Cloudinary...");

            var uploadResult = await _cloudinaryService.UploadVideoAsync(request.AudioFile, "speaking_submissions");
            if (uploadResult == null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
            {
                var errMsg = "Error: Failed to upload audio file to Cloudinary.";
                _logger.LogError(errMsg);
                Console.WriteLine(errMsg);
                throw new InvalidOperationException("Failed to upload audio file to storage.");
            }

            var audioUrl = uploadResult.SecureUrl.ToString();
            _logger.LogInformation("Cloudinary upload successful. AudioUrl: {AudioUrl}", audioUrl);
            Console.WriteLine($"Cloudinary upload successful. AudioUrl: {audioUrl}");

            // 5. Create and save submission record via Repository
            var submission = new SpeakingSubmission
            {
                LessonId = request.LessonId,
                LearnerId = learnerId,
                AudioUrl = audioUrl,
                Note = request.Note,
                Status = SpeakingSubmissionStatus.SUBMITTED,
                SubmittedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _submissionRepository.AddAsync(submission);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Saved SpeakingSubmission record (ID: {SubmissionId}) to PostgreSQL.", submission.SubmissionId);
            Console.WriteLine($"Saved SpeakingSubmission record (ID: {submission.SubmissionId}) to PostgreSQL.");

            // 6. Fetch full details for response
            var fullSubmission = await _submissionRepository.GetByIdWithDetailsAsync(submission.SubmissionId);
            return MapToResponseDto(fullSubmission ?? submission);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in SubmitSpeakingAssignmentAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            Console.WriteLine($"{errMsg}\n{ex.StackTrace}");
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
            Console.WriteLine($"{errMsg}\n{ex.StackTrace}");
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
            Console.WriteLine($"{errMsg}\n{ex.StackTrace}");
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
            Console.WriteLine($"{errMsg}\n{ex.StackTrace}");
            throw;
        }
    }

    public async Task<IEnumerable<SpeakingSubmissionResponseDto>> GetSubmissionsByCourseForInstructorAsync(int instructorId, int courseId)
    {
        try
        {
            var submissions = await _submissionRepository.GetSubmissionsByCourseAsync(courseId);
            // Security check: ensure course belongs to instructor
            var filtered = submissions.Where(s => s.Lesson?.Course?.InstructorId == instructorId);
            return filtered.Select(MapToResponseDto);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GetSubmissionsByCourseForInstructorAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            Console.WriteLine($"{errMsg}\n{ex.StackTrace}");
            throw;
        }
    }

    public async Task<SpeakingSubmissionResponseDto?> GradeSubmissionAsync(int instructorId, int submissionId, GradeSpeakingSubmissionRequest request)
    {
        try
        {
            var submission = await _submissionRepository.GetByIdWithDetailsAsync(submissionId);
            if (submission == null)
            {
                var errMsg = $"Error: Submission with ID {submissionId} not found.";
                _logger.LogError(errMsg);
                Console.WriteLine(errMsg);
                return null;
            }

            // Verify instructor owns the course
            if (submission.Lesson?.Course?.InstructorId != instructorId)
            {
                var errMsg = $"Error: Instructor ID {instructorId} is not authorized to grade submission ID {submissionId}.";
                _logger.LogError(errMsg);
                Console.WriteLine(errMsg);
                throw new UnauthorizedAccessException("You are not authorized to grade this submission.");
            }

            submission.Score = request.Score;
            submission.Feedback = request.Feedback;
            submission.Status = SpeakingSubmissionStatus.GRADED;
            submission.GradedById = instructorId;
            submission.GradedAt = DateTime.UtcNow;
            submission.UpdatedAt = DateTime.UtcNow;

            _submissionRepository.Update(submission);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Submission ID {SubmissionId} successfully graded by Instructor ID {InstructorId}.", submissionId, instructorId);
            Console.WriteLine($"Submission ID {submissionId} successfully graded by Instructor ID {instructorId}.");

            return MapToResponseDto(submission);
        }
        catch (Exception ex)
        {
            var errMsg = $"Error in GradeSubmissionAsync: {ex.Message}";
            _logger.LogError(ex, errMsg);
            Console.WriteLine($"{errMsg}\n{ex.StackTrace}");
            throw;
        }
    }

    private static SpeakingSubmissionResponseDto MapToResponseDto(SpeakingSubmission submission)
    {
        var lesson = submission.Lesson;
        var course = lesson?.Course;
        var module = lesson?.Module;
        var learner = submission.Learner;
        var instructor = course?.Instructor;
        var gradedBy = submission.GradedBy;

        return new SpeakingSubmissionResponseDto
        {
            SubmissionId = submission.SubmissionId,
            LessonId = submission.LessonId,
            LessonTitle = lesson?.Title ?? string.Empty,
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
