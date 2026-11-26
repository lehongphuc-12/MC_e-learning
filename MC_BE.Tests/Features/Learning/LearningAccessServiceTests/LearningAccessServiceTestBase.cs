using System;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.Services;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MC_BE.Tests.Features.Learning.LearningAccessServiceTests;

public abstract class LearningAccessServiceTestBase : IDisposable
{
    protected readonly SmartMcDbContext DbContext;
    protected readonly LearningAccessService Service;

    protected LearningAccessServiceTestBase()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        DbContext = new SmartMcDbContext(options);
        DbContext.Database.EnsureCreated();

        Service = new LearningAccessService(DbContext);
    }

    protected Course CreateCourse(int courseId, int instructorId = 1, string title = "Sample Course")
    {
        var course = new Course
        {
            CourseId = courseId,
            InstructorId = instructorId,
            Title = title,
            Slug = $"course-{courseId}-{Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Courses.Add(course);
        DbContext.SaveChanges();
        return course;
    }

    protected Module CreateModule(int moduleId, int courseId, string title = "Module", int orderIndex = 1)
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
        int orderIndex = 1,
        bool isPreview = false,
        LessonStatus status = LessonStatus.ACTIVE)
    {
        var lesson = new Lesson
        {
            LessonId = lessonId,
            CourseId = courseId,
            ModuleId = moduleId,
            Title = $"Lesson {lessonId}",
            OrderIndex = orderIndex,
            IsPreview = isPreview,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Lessons.Add(lesson);
        DbContext.SaveChanges();
        return lesson;
    }

    protected CourseMaterial CreateLessonVideoMaterial(
        int materialId,
        int courseId,
        int lessonId,
        string fileUrl = "https://example.com/video.mp4")
    {
        var material = new CourseMaterial
        {
            MaterialId = materialId,
            CourseId = courseId,
            LessonId = lessonId,
            UploaderId = 1,
            Title = "Lesson Video",
            MaterialType = MaterialType.VIDEO,
            FileUrl = fileUrl,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.CourseMaterials.Add(material);
        DbContext.SaveChanges();
        return material;
    }

    protected Enrollment CreateEnrollment(
        int enrollmentId,
        int learnerId,
        int courseId,
        string status = "ACTIVE")
    {
        var enrollment = new Enrollment
        {
            EnrollmentId = enrollmentId,
            LearnerId = learnerId,
            CourseId = courseId,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Enrollments.Add(enrollment);
        DbContext.SaveChanges();
        return enrollment;
    }

    protected LessonProgress CreateLessonProgress(
        int progressId,
        int enrollmentId,
        int lessonId,
        bool isCompleted = true,
        LessonProgressStatus status = LessonProgressStatus.COMPLETED)
    {
        var progress = new LessonProgress
        {
            LessonProgressId = progressId,
            EnrollmentId = enrollmentId,
            LessonId = lessonId,
            IsCompleted = isCompleted,
            Status = status,
            UpdatedAt = DateTime.UtcNow
        };
        DbContext.LessonProgresses.Add(progress);
        DbContext.SaveChanges();
        return progress;
    }

    protected Quiz CreateQuiz(
        int quizId,
        int? courseId,
        int? lessonId,
        int? moduleId,
        QuizPurpose purpose,
        QuizStatus status = QuizStatus.ACTIVE,
        DateTime? availableFrom = null,
        DateTime? availableUntil = null)
    {
        var quiz = new Quiz
        {
            QuizId = quizId,
            CourseId = courseId,
            LessonId = lessonId,
            ModuleId = moduleId,
            Title = $"Quiz {quizId}",
            CreatedById = 1,
            Purpose = purpose,
            Status = status,
            AvailableFrom = availableFrom,
            AvailableUntil = availableUntil
        };
        DbContext.Quizzes.Add(quiz);
        DbContext.SaveChanges();
        return quiz;
    }

    protected QuizAttempt CreateQuizAttempt(
        int attemptId,
        int quizId,
        int userId,
        QuizAttemptStatus status = QuizAttemptStatus.PASSED)
    {
        var attempt = new QuizAttempt
        {
            AttemptId = attemptId,
            QuizId = quizId,
            UserId = userId,
            ResultStatus = status,
            StartedAt = DateTime.UtcNow,
            SubmittedAt = DateTime.UtcNow
        };
        DbContext.QuizAttempts.Add(attempt);
        DbContext.SaveChanges();
        return attempt;
    }

    public void Dispose()
    {
        DbContext.Database.EnsureDeleted();
        DbContext.Dispose();
        GC.SuppressFinalize(this);
    }
}
