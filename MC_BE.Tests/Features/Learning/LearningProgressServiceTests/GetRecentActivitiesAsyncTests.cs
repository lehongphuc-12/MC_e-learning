using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningProgressServiceTests;

public class GetRecentActivitiesAsyncTests : LearningProgressServiceTestBase
{
    [Fact]
    public async Task GetRecentActivitiesAsync_WhenVariousActivitiesExist_AggregatesAndSortsDescending()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId, enrolledAt: DateTime.UtcNow.AddHours(-5));
        var lesson = CreateLesson(1, course.CourseId);

        // 1. Completed lesson
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: true, completedAt: DateTime.UtcNow.AddMinutes(-30));

        // 2. Certificate
        CreateCertificate(1, enr.EnrollmentId, "CERT-2026-ACT");

        // 3. Forum post
        CreateForumPost(10, learnerId, "My Question");

        // 4. Forum comment
        CreateForumComment(20, 10, learnerId);

        // 5. Forum reaction
        CreateForumReaction(30, learnerId, 10);

        // 6. Speaking submission
        CreateSpeakingSubmission(40, learnerId, lessonId: lesson.LessonId);

        // Act
        var result = await Service.GetRecentActivitiesAsync(learnerId, limit: 10);

        // Assert
        result.Should().NotBeNull();
        result.Should().NotBeEmpty();
        // Check sorting: each item CreatedAt should be >= next item CreatedAt
        for (int i = 0; i < result.Count - 1; i++)
        {
            result[i].CreatedAt.Should().BeOnOrAfter(result[i + 1].CreatedAt);
        }

        // Relative time formatting populated
        result.Should().AllSatisfy(a => a.Time.Should().NotBeNullOrWhiteSpace());
    }

    [Fact]
    public async Task GetRecentActivitiesAsync_WhenLearnerHasNoActivities_ReturnsEmptyList()
    {
        // Act
        var result = await Service.GetRecentActivitiesAsync(learnerId: 9999);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetRecentActivitiesAsync_WhenActivitiesExceedLimit_TruncatesToLimit()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        // Create 10 completed lessons
        for (int i = 1; i <= 10; i++)
        {
            var lesson = CreateLesson(i, course.CourseId, orderIndex: i);
            CreateLessonProgress(i, enr.EnrollmentId, lesson.LessonId, isCompleted: true, completedAt: DateTime.UtcNow.AddMinutes(-i));
        }

        // Act
        var result = await Service.GetRecentActivitiesAsync(learnerId, limit: 4);

        // Assert
        result.Should().HaveCount(4);
    }

    [Fact]
    public async Task GetRecentActivitiesAsync_WhenActivityIsOlderThan24Hours_FormatsRelativeTimeAsDaysAgo()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId, enrolledAt: DateTime.UtcNow.AddDays(-3));

        // Act
        var result = await Service.GetRecentActivitiesAsync(learnerId, limit: 1);

        // Assert
        result.Should().HaveCount(1);
        result[0].Time.Should().Match("*d ago");
    }
}
