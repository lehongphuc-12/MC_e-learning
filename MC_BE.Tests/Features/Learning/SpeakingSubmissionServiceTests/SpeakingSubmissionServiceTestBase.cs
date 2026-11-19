using System;
using System.IO;
using System.Text;
using CloudinaryDotNet.Actions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Learning.Repositories;
using MC_BE.Features.Learning.Services;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Moq;

namespace MC_BE.Tests.Features.Learning.SpeakingSubmissionServiceTests;

public abstract class SpeakingSubmissionServiceTestBase : IDisposable
{
    protected readonly SmartMcDbContext DbContext;
    protected readonly SpeakingSubmissionRepository SubmissionRepository;
    protected readonly SpeakingScriptRepository ScriptRepository;
    protected readonly GenericRepository<Lesson> LessonRepository;
    protected readonly GenericRepository<Enrollment> EnrollmentRepository;
    protected readonly GenericRepository<LessonProgress> LessonProgressRepository;
    protected readonly Mock<ICloudinaryService> CloudinaryServiceMock = new();
    protected readonly Mock<ICourseLearningAccessService> CourseAccessMock = new();
    protected readonly Mock<ILogger<SpeakingSubmissionService>> LoggerMock = new();
    protected readonly UnitOfWork UnitOfWork;
    protected readonly SpeakingSubmissionService Service;

    protected SpeakingSubmissionServiceTestBase()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        DbContext = new SmartMcDbContext(options);
        DbContext.Database.EnsureCreated();

        SubmissionRepository = new SpeakingSubmissionRepository(DbContext);
        ScriptRepository = new SpeakingScriptRepository(DbContext);
        LessonRepository = new GenericRepository<Lesson>(DbContext);
        EnrollmentRepository = new GenericRepository<Enrollment>(DbContext);
        LessonProgressRepository = new GenericRepository<LessonProgress>(DbContext);
        UnitOfWork = new UnitOfWork(DbContext);

        // Setup default mock responses
        CourseAccessMock.Setup(c => c.CanAccessCourseAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<bool>()))
            .ReturnsAsync(true);

        CloudinaryServiceMock.Setup(c => c.UploadVideoAsync(It.IsAny<IFormFile>(), It.IsAny<string>()))
            .ReturnsAsync(new VideoUploadResult
            {
                SecureUrl = new Uri("https://res.cloudinary.com/demo/video/upload/sample.mp3"),
                PublicId = "sample_audio_123"
            });

        Service = new SpeakingSubmissionService(
            SubmissionRepository,
            ScriptRepository,
            LessonRepository,
            EnrollmentRepository,
            LessonProgressRepository,
            CloudinaryServiceMock.Object,
            UnitOfWork,
            LoggerMock.Object,
            CourseAccessMock.Object
        );
    }

    protected User CreateUser(int userId, string fullName = "Test User", string email = "user@example.com")
    {
        var user = new User
        {
            UserId = userId,
            FullName = fullName,
            Email = email,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Users.Add(user);
        DbContext.SaveChanges();
        return user;
    }

    protected Course CreateCourse(int courseId, int instructorId = 1, string title = "Sample Course")
    {
        var instructor = DbContext.Users.Find(instructorId) ?? CreateUser(instructorId, "Instructor User", $"inst{instructorId}@example.com");
        var course = new Course
        {
            CourseId = courseId,
            InstructorId = instructorId,
            Instructor = instructor,
            Title = title,
            Slug = $"course-{courseId}-{Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Courses.Add(course);
        DbContext.SaveChanges();
        return course;
    }

    protected Module CreateModule(int moduleId, int courseId, string title = "Module 1", int orderIndex = 1)
    {
        var module = new Module
        {
            ModuleId = moduleId,
            CourseId = courseId,
            Title = title,
            OrderIndex = orderIndex,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Modules.Add(module);
        DbContext.SaveChanges();
        return module;
    }

    protected Lesson CreateLesson(
        int lessonId,
        int courseId,
        int? moduleId = null,
        string title = "Lesson 1",
        int orderIndex = 1,
        LessonStatus status = LessonStatus.ACTIVE)
    {
        var lesson = new Lesson
        {
            LessonId = lessonId,
            CourseId = courseId,
            ModuleId = moduleId,
            Title = title,
            OrderIndex = orderIndex,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Lessons.Add(lesson);
        DbContext.SaveChanges();
        return lesson;
    }

    protected SpeakingScript CreateSpeakingScript(
        int scriptId,
        int courseId,
        int? moduleId = null,
        int? lessonId = null,
        string title = "Speaking Assignment",
        SpeakingScope scope = SpeakingScope.LESSON)
    {
        var script = new SpeakingScript
        {
            ScriptId = scriptId,
            CourseId = courseId,
            ModuleId = moduleId,
            LessonId = lessonId,
            Title = title,
            Scope = scope,
            Status = SpeakingScriptStatus.PUBLISHED,
            UpdatedAt = DateTime.UtcNow
        };
        DbContext.SpeakingScripts.Add(script);
        DbContext.SaveChanges();
        return script;
    }

    protected Enrollment CreateEnrollment(
        int enrollmentId,
        int learnerId,
        int courseId,
        string status = "ACTIVE")
    {
        var learner = DbContext.Users.Find(learnerId) ?? CreateUser(learnerId, "Learner User", $"learner{learnerId}@example.com");
        var enrollment = new Enrollment
        {
            EnrollmentId = enrollmentId,
            LearnerId = learnerId,
            CourseId = courseId,
            Status = status,
            EnrolledAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Learner = learner
        };
        DbContext.Enrollments.Add(enrollment);
        DbContext.SaveChanges();
        return enrollment;
    }

    protected LessonProgress CreateLessonProgress(
        int progressId,
        int enrollmentId,
        int lessonId,
        bool isCompleted = false,
        LessonProgressStatus status = LessonProgressStatus.IN_PROGRESS,
        DateTime? completedAt = null)
    {
        var progress = new LessonProgress
        {
            LessonProgressId = progressId,
            EnrollmentId = enrollmentId,
            LessonId = lessonId,
            IsCompleted = isCompleted,
            Status = status,
            CompletedAt = completedAt,
            LastPositionSeconds = 0,
            TimeSpentSeconds = 60,
            TimeSpentMinutes = 1,
            LastAccessedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        DbContext.LessonProgresses.Add(progress);
        DbContext.SaveChanges();
        return progress;
    }

    protected SpeakingSubmission CreateSubmission(
        int submissionId,
        int learnerId,
        int? lessonId = null,
        int? scriptId = null,
        string audioUrl = "https://res.cloudinary.com/demo/audio.mp3",
        SpeakingSubmissionStatus status = SpeakingSubmissionStatus.SUBMITTED,
        decimal? score = null,
        string? feedback = null,
        int? gradedById = null)
    {
        var learner = DbContext.Users.Find(learnerId) ?? CreateUser(learnerId, "Learner", $"learner{learnerId}@example.com");
        var submission = new SpeakingSubmission
        {
            SubmissionId = submissionId,
            LearnerId = learnerId,
            LessonId = lessonId,
            ScriptId = scriptId,
            AudioUrl = audioUrl,
            Status = status,
            Score = score,
            Feedback = feedback,
            GradedById = gradedById,
            SubmittedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Learner = learner
        };
        DbContext.SpeakingSubmissions.Add(submission);
        DbContext.SaveChanges();
        return submission;
    }

    protected static IFormFile CreateMockAudioFile(string fileName = "audio.mp3", string contentType = "audio/mpeg", byte[]? bytes = null)
    {
        bytes ??= Encoding.UTF8.GetBytes("fake audio content bytes");
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "AudioFile", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    public void Dispose()
    {
        DbContext.Database.EnsureDeleted();
        DbContext.Dispose();
        GC.SuppressFinalize(this);
    }
}
