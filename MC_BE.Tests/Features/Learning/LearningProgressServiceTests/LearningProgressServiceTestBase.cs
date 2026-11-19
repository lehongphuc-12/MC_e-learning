using System;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;

namespace MC_BE.Tests.Features.Learning.LearningProgressServiceTests;

public abstract class LearningProgressServiceTestBase : IDisposable
{
    protected readonly SmartMcDbContext DbContext;
    protected readonly Mock<ICertificateService> CertificateServiceMock = new();
    protected readonly Mock<ICourseLearningAccessService> CourseAccessMock = new();
    protected readonly Mock<ILearningAccessService> AccessMock = new();
    protected readonly LearningProgressService Service;

    protected LearningProgressServiceTestBase()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        DbContext = new SmartMcDbContext(options);
        DbContext.Database.EnsureCreated();

        CourseAccessMock
            .Setup(c => c.CanAccessCourseAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<bool>()))
            .ReturnsAsync(true);

        AccessMock
            .Setup(a => a.CheckCertificateAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync((true, null));

        AccessMock
            .Setup(a => a.CheckLessonAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync((true, null));

        var enrollmentRepo = new GenericRepository<Enrollment>(DbContext);
        var lessonRepo = new GenericRepository<Lesson>(DbContext);
        var progressRepo = new GenericRepository<LessonProgress>(DbContext);
        var certificateRepo = new GenericRepository<Certificate>(DbContext);
        var postRepo = new GenericRepository<ForumPost>(DbContext);
        var commentRepo = new GenericRepository<ForumComment>(DbContext);
        var reactionRepo = new GenericRepository<ForumReaction>(DbContext);
        var submissionRepo = new GenericRepository<SpeakingSubmission>(DbContext);
        var unitOfWork = new UnitOfWork(DbContext);

        Service = new LearningProgressService(
            enrollmentRepo,
            lessonRepo,
            progressRepo,
            certificateRepo,
            postRepo,
            commentRepo,
            reactionRepo,
            submissionRepo,
            unitOfWork,
            CertificateServiceMock.Object,
            CourseAccessMock.Object,
            AccessMock.Object,
            DbContext
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
        string title = "Lesson",
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

    protected Enrollment CreateEnrollment(
        int enrollmentId,
        int learnerId,
        int courseId,
        string status = "ACTIVE",
        decimal completionPercentage = 0m,
        DateTime? expiresAt = null,
        DateTime? enrolledAt = null)
    {
        var learner = DbContext.Users.Find(learnerId) ?? CreateUser(learnerId, "Learner User", $"learner{learnerId}@example.com");
        var course = DbContext.Courses.Find(courseId) ?? CreateCourse(courseId);

        var enrollment = new Enrollment
        {
            EnrollmentId = enrollmentId,
            LearnerId = learnerId,
            CourseId = courseId,
            Status = status,
            CompletionPercentage = completionPercentage,
            ExpiresAt = expiresAt,
            EnrolledAt = enrolledAt ?? DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Learner = learner,
            Course = course
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
        LessonProgressStatus status = LessonProgressStatus.COMPLETED,
        DateTime? completedAt = null,
        int timeSpentSeconds = 300,
        int lastPositionSeconds = 300)
    {
        var progress = new LessonProgress
        {
            LessonProgressId = progressId,
            EnrollmentId = enrollmentId,
            LessonId = lessonId,
            IsCompleted = isCompleted,
            Status = status,
            TimeSpentSeconds = timeSpentSeconds,
            TimeSpentMinutes = timeSpentSeconds / 60,
            LastPositionSeconds = lastPositionSeconds,
            CompletedAt = completedAt ?? (isCompleted ? DateTime.UtcNow : null),
            LastAccessedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        DbContext.LessonProgresses.Add(progress);
        DbContext.SaveChanges();
        return progress;
    }

    protected Quiz CreateQuiz(
        int quizId,
        int? courseId,
        int? moduleId,
        int? lessonId,
        QuizPurpose purpose,
        QuizStatus status = QuizStatus.ACTIVE)
    {
        var quiz = new Quiz
        {
            QuizId = quizId,
            CourseId = courseId,
            ModuleId = moduleId,
            LessonId = lessonId,
            Title = $"Quiz {quizId}",
            CreatedById = 1,
            Purpose = purpose,
            Status = status
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

    protected SpeakingScript CreateSpeakingScript(
        int scriptId,
        int courseId,
        int? lessonId = null,
        int? moduleId = null,
        string title = "Speaking Script")
    {
        var script = new SpeakingScript
        {
            ScriptId = scriptId,
            CourseId = courseId,
            LessonId = lessonId,
            ModuleId = moduleId,
            Title = title,
            PassingScore = 80.00m,
            Status = SpeakingScriptStatus.PUBLISHED,
            UpdatedAt = DateTime.UtcNow
        };
        DbContext.SpeakingScripts.Add(script);
        DbContext.SaveChanges();
        return script;
    }

    protected SpeakingSubmission CreateSpeakingSubmission(
        int submissionId,
        int learnerId,
        int? scriptId = null,
        int? lessonId = null,
        decimal score = 85.00m)
    {
        var submission = new SpeakingSubmission
        {
            SubmissionId = submissionId,
            LearnerId = learnerId,
            ScriptId = scriptId,
            LessonId = lessonId,
            Score = score,
            AudioUrl = "https://audio.com/submission.mp3",
            Status = SpeakingSubmissionStatus.GRADED,
            SubmittedAt = DateTime.UtcNow
        };
        DbContext.SpeakingSubmissions.Add(submission);
        DbContext.SaveChanges();
        return submission;
    }

    protected Certificate CreateCertificate(
        int certificateId,
        int enrollmentId,
        string certificateCode = "CERT-2026-TEST")
    {
        var cert = new Certificate
        {
            CertificateId = certificateId,
            EnrollmentId = enrollmentId,
            CertificateCode = certificateCode,
            Status = "ACTIVE",
            IssuedAt = DateTime.UtcNow,
            CompletionPercentage = 100.00m
        };
        DbContext.Certificates.Add(cert);
        DbContext.SaveChanges();
        return cert;
    }

    protected ForumPost CreateForumPost(int postId, int authorId, string title = "Discussion")
    {
        var post = new ForumPost
        {
            PostId = postId,
            TopicId = 1,
            AuthorId = authorId,
            Title = title,
            Content = "Post Content",
            Status = "PUBLISHED",
            CreatedAt = DateTime.UtcNow
        };
        DbContext.ForumPosts.Add(post);
        DbContext.SaveChanges();
        return post;
    }

    protected ForumComment CreateForumComment(int commentId, int postId, int authorId)
    {
        var comment = new ForumComment
        {
            CommentId = commentId,
            PostId = postId,
            AuthorId = authorId,
            Content = "Comment text",
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };
        DbContext.ForumComments.Add(comment);
        DbContext.SaveChanges();
        return comment;
    }

    protected ForumReaction CreateForumReaction(int reactionId, int userId, int postId, string reactionType = "LIKE")
    {
        var reaction = new ForumReaction
        {
            ReactionId = reactionId,
            UserId = userId,
            TargetType = "POST",
            PostId = postId,
            ReactionType = reactionType,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.ForumReactions.Add(reaction);
        DbContext.SaveChanges();
        return reaction;
    }

    public void Dispose()
    {
        DbContext.Database.EnsureDeleted();
        DbContext.Dispose();
        GC.SuppressFinalize(this);
    }
}
