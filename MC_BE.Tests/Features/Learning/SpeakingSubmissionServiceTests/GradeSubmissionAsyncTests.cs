using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingSubmissionServiceTests;

public class GradeSubmissionAsyncTests : SpeakingSubmissionServiceTestBase
{
    [Fact]
    public async Task GradeSubmissionAsync_WhenScore80OrAbove_MarksGradedAndCompletesLessonProgress()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(10, course.CourseId);
        var enrollment = CreateEnrollment(1, learner.UserId, course.CourseId);
        var progress = CreateLessonProgress(1, enrollment.EnrollmentId, lesson.LessonId, isCompleted: false, status: LessonProgressStatus.IN_PROGRESS);

        var submission = CreateSubmission(1, learner.UserId, lesson.LessonId, null);

        var request = new GradeSpeakingSubmissionRequest
        {
            Score = 90,
            Feedback = "Well articulated and clear intonation."
        };

        // Act
        var result = await Service.GradeSubmissionAsync(instructor.UserId, submission.SubmissionId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SpeakingSubmissionStatus.GRADED.ToString());
        result.Score.Should().Be(90);
        result.Feedback.Should().Be("Well articulated and clear intonation.");
        result.GradedById.Should().Be(instructor.UserId);
        result.IsPassed.Should().BeTrue();

        var updatedProgress = await DbContext.LessonProgresses.FindAsync(progress.LessonProgressId);
        updatedProgress.Should().NotBeNull();
        updatedProgress!.IsCompleted.Should().BeTrue();
        updatedProgress.Status.Should().Be(LessonProgressStatus.COMPLETED);
        updatedProgress.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenScoreUnder80_MarksNeedsResubmissionAndSetsProgressInProgress()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(10, course.CourseId);
        var enrollment = CreateEnrollment(1, learner.UserId, course.CourseId);
        var progress = CreateLessonProgress(1, enrollment.EnrollmentId, lesson.LessonId, isCompleted: true, status: LessonProgressStatus.COMPLETED);

        var submission = CreateSubmission(1, learner.UserId, lesson.LessonId, null);

        var request = new GradeSpeakingSubmissionRequest
        {
            Score = 65,
            Feedback = "Pronunciation needs significant improvement."
        };

        // Act
        var result = await Service.GradeSubmissionAsync(instructor.UserId, submission.SubmissionId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SpeakingSubmissionStatus.NEEDS_RESUBMISSION.ToString());
        result.Score.Should().Be(65);
        result.Feedback.Should().Be("Pronunciation needs significant improvement.");
        result.IsPassed.Should().BeFalse();

        var updatedProgress = await DbContext.LessonProgresses.FindAsync(progress.LessonProgressId);
        updatedProgress.Should().NotBeNull();
        updatedProgress!.IsCompleted.Should().BeFalse();
        updatedProgress.Status.Should().Be(LessonProgressStatus.IN_PROGRESS);
        updatedProgress.CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenLessonProgressDoesNotExist_CreatesNewProgressRecord()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(10, course.CourseId);
        var enrollment = CreateEnrollment(1, learner.UserId, course.CourseId);

        // No LessonProgress in DB yet
        var submission = CreateSubmission(1, learner.UserId, lesson.LessonId, null);

        var request = new GradeSpeakingSubmissionRequest
        {
            Score = 85,
            Feedback = "Passed on first grading."
        };

        // Act
        var result = await Service.GradeSubmissionAsync(instructor.UserId, submission.SubmissionId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SpeakingSubmissionStatus.GRADED.ToString());

        var newProgress = await DbContext.LessonProgresses.FirstOrDefaultAsync(
            lp => lp.EnrollmentId == enrollment.EnrollmentId && lp.LessonId == lesson.LessonId);
        newProgress.Should().NotBeNull();
        newProgress!.IsCompleted.Should().BeTrue();
        newProgress.Status.Should().Be(LessonProgressStatus.COMPLETED);
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenScoreIsNegative_ThrowsArgumentException()
    {
        // Arrange
        var instructorId = 1;
        var submissionId = 10;
        var request = new GradeSpeakingSubmissionRequest
        {
            Score = -5,
            Feedback = "Negative score"
        };

        // Act
        var act = async () => await Service.GradeSubmissionAsync(instructorId, submissionId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Score must be between 0 and 100.*");
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenScoreExceeds100_ThrowsArgumentException()
    {
        // Arrange
        var instructorId = 1;
        var submissionId = 10;
        var request = new GradeSpeakingSubmissionRequest
        {
            Score = 105,
            Feedback = "Exceeds 100"
        };

        // Act
        var act = async () => await Service.GradeSubmissionAsync(instructorId, submissionId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Score must be between 0 and 100.*");
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenSubmissionNotFound_ReturnsNull()
    {
        // Arrange
        var instructorId = 1;
        var request = new GradeSpeakingSubmissionRequest { Score = 80 };

        // Act
        var result = await Service.GradeSubmissionAsync(instructorId, submissionId: 9999, request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenInstructorDoesNotOwnCourse_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var realInstructor = CreateUser(1, "Real Instructor", "real@example.com");
        var intruderInstructor = CreateUser(2, "Intruder Instructor", "intruder@example.com");
        var learner = CreateUser(3, "Learner", "learner@example.com");

        var course = CreateCourse(100, realInstructor.UserId);
        var lesson = CreateLesson(10, course.CourseId);
        var submission = CreateSubmission(1, learner.UserId, lesson.LessonId, null);

        var request = new GradeSpeakingSubmissionRequest { Score = 80 };

        // Act
        var act = async () => await Service.GradeSubmissionAsync(intruderInstructor.UserId, submission.SubmissionId, request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("*You are not authorized to grade this submission.*");
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenScoreExactly80_MarksAsGradedAndPassed()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(10, course.CourseId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        var submission = CreateSubmission(1, learner.UserId, lesson.LessonId, null);

        var request = new GradeSpeakingSubmissionRequest
        {
            Score = 80,
            Feedback = "Exactly reached passing score."
        };

        // Act
        var result = await Service.GradeSubmissionAsync(instructor.UserId, submission.SubmissionId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SpeakingSubmissionStatus.GRADED.ToString());
        result.Score.Should().Be(80);
        result.IsPassed.Should().BeTrue();
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenScoreExactly79Point9_MarksAsNeedsResubmission()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(10, course.CourseId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        var submission = CreateSubmission(1, learner.UserId, lesson.LessonId, null);

        var request = new GradeSpeakingSubmissionRequest
        {
            Score = 79.9m,
            Feedback = "Just under 80 threshold."
        };

        // Act
        var result = await Service.GradeSubmissionAsync(instructor.UserId, submission.SubmissionId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SpeakingSubmissionStatus.NEEDS_RESUBMISSION.ToString());
        result.Score.Should().Be(79.9m);
        result.IsPassed.Should().BeFalse();
    }

    [Fact]
    public async Task GradeSubmissionAsync_WhenGradingScriptWithoutLesson_GradesSuccessfullyWithoutProgressUpdate()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var finalScript = CreateSpeakingScript(30, course.CourseId, null, null, "Final Exam", SpeakingScope.FINAL);

        var submission = CreateSubmission(1, learner.UserId, null, finalScript.ScriptId);

        var request = new GradeSpeakingSubmissionRequest
        {
            Score = 100,
            Feedback = "Flawless final performance."
        };

        // Act
        var result = await Service.GradeSubmissionAsync(instructor.UserId, submission.SubmissionId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(SpeakingSubmissionStatus.GRADED.ToString());
        result.Score.Should().Be(100);
        result.GradeTier.Should().Be("Xuất sắc");
        result.IsPassed.Should().BeTrue();
    }
}
