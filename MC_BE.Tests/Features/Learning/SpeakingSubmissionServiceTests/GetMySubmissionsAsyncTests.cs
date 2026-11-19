using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingSubmissionServiceTests;

public class GetMySubmissionsAsyncTests : SpeakingSubmissionServiceTestBase
{
    [Fact]
    public async Task GetMySubmissionsAsync_WhenLearnerHasSubmissions_ReturnsAllMappedDtosDescendingByDate()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        var sub1 = CreateSubmission(1, learner.UserId, lesson.LessonId, null, score: 75);
        sub1.SubmittedAt = DateTime.UtcNow.AddDays(-3);
        DbContext.SaveChanges();

        var sub2 = CreateSubmission(2, learner.UserId, lesson.LessonId, null, score: 88);
        sub2.SubmittedAt = DateTime.UtcNow.AddMinutes(-10);
        DbContext.SaveChanges();

        // Act
        var result = (await Service.GetMySubmissionsAsync(learner.UserId)).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.First().SubmissionId.Should().Be(sub2.SubmissionId);
        result.Last().SubmissionId.Should().Be(sub1.SubmissionId);
    }

    [Fact]
    public async Task GetMySubmissionsAsync_WhenLearnerHasNoSubmissions_ReturnsEmptyCollection()
    {
        // Act
        var result = await Service.GetMySubmissionsAsync(learnerId: 9999);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMySubmissionsAsync_WhenSubmissionsHaveDiverseStatuses_CorrectlyMapsGradeAndStatus()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        CreateSubmission(1, learner.UserId, lesson.LessonId, null, status: SpeakingSubmissionStatus.SUBMITTED, score: null);
        CreateSubmission(2, learner.UserId, lesson.LessonId, null, status: SpeakingSubmissionStatus.NEEDS_RESUBMISSION, score: 60);
        CreateSubmission(3, learner.UserId, lesson.LessonId, null, status: SpeakingSubmissionStatus.GRADED, score: 95);

        // Act
        var result = (await Service.GetMySubmissionsAsync(learner.UserId)).ToList();

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain(s => s.Status == "SUBMITTED" && s.Score == null && s.IsPassed == null);
        result.Should().Contain(s => s.Status == "NEEDS_RESUBMISSION" && s.Score == 60 && s.IsPassed == false);
        result.Should().Contain(s => s.Status == "GRADED" && s.Score == 95 && s.IsPassed == true && s.GradeTier == "Xuất sắc");
    }
}
