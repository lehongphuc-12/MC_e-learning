using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingSubmissionServiceTests;

public class GetLatestSubmissionByLessonAsyncTests : SpeakingSubmissionServiceTestBase
{
    [Fact]
    public async Task GetLatestSubmissionByLessonAsync_WhenSubmissionExists_ReturnsMappedDto()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        var submission = CreateSubmission(
            1, learner.UserId, lesson.LessonId, null,
            status: SpeakingSubmissionStatus.GRADED,
            score: 85,
            feedback: "Great job!"
        );

        // Act
        var result = await Service.GetLatestSubmissionByLessonAsync(learner.UserId, lesson.LessonId);

        // Assert
        result.Should().NotBeNull();
        result!.SubmissionId.Should().Be(submission.SubmissionId);
        result.LessonId.Should().Be(lesson.LessonId);
        result.Score.Should().Be(85);
        result.Feedback.Should().Be("Great job!");
        result.IsPassed.Should().BeTrue();
    }

    [Fact]
    public async Task GetLatestSubmissionByLessonAsync_WhenNoSubmissionExists_ReturnsNull()
    {
        // Act
        var result = await Service.GetLatestSubmissionByLessonAsync(learnerId: 999, lessonId: 888);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLatestSubmissionByLessonAsync_WhenMultipleSubmissionsOverTime_ReturnsLatestSubmission()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        var first = CreateSubmission(1, learner.UserId, lesson.LessonId, null, score: 70);
        first.SubmittedAt = DateTime.UtcNow.AddDays(-2);
        DbContext.SaveChanges();

        var latest = CreateSubmission(2, learner.UserId, lesson.LessonId, null, score: 90);
        latest.SubmittedAt = DateTime.UtcNow;
        DbContext.SaveChanges();

        // Act
        var result = await Service.GetLatestSubmissionByLessonAsync(learner.UserId, lesson.LessonId);

        // Assert
        result.Should().NotBeNull();
        result!.SubmissionId.Should().Be(latest.SubmissionId);
        result.Score.Should().Be(90);
    }
}
