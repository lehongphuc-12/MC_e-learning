using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningProgressServiceTests;

public class GetLearningStreakAsyncTests : LearningProgressServiceTestBase
{
    [Fact]
    public async Task GetLearningStreakAsync_WhenConsecutiveDailyCompletions_ReturnsAccurateStreak()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);

        var now = DateTime.UtcNow;
        // Yesterday VN time and today VN time
        var yesterdayUtc = now.AddDays(-1);
        var todayUtc = now;

        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true, completedAt: yesterdayUtc);
        CreateLessonProgress(2, enr.EnrollmentId, lesson2.LessonId, isCompleted: true, completedAt: todayUtc);

        // Act
        var result = await Service.GetLearningStreakAsync(learnerId);

        // Assert
        result.Should().NotBeNull();
        result.CurrentStreak.Should().Be(2);
        result.LongestStreak.Should().Be(2);
    }

    [Fact]
    public async Task GetLearningStreakAsync_WhenLastCompletionWasTwoDaysAgo_ResetsCurrentStreakToZero()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);

        var now = DateTime.UtcNow;
        var threeDaysAgo = now.AddDays(-3);
        var twoDaysAgo = now.AddDays(-2);

        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true, completedAt: threeDaysAgo);
        CreateLessonProgress(2, enr.EnrollmentId, lesson2.LessonId, isCompleted: true, completedAt: twoDaysAgo);

        // Act
        var result = await Service.GetLearningStreakAsync(learnerId);

        // Assert
        result.Should().NotBeNull();
        result.CurrentStreak.Should().Be(0); // Streak broken
        result.LongestStreak.Should().Be(2); // Historical longest streak preserved
    }

    [Fact]
    public async Task GetLearningStreakAsync_WhenNoCompletedLessons_ReturnsZeroStreak()
    {
        // Act
        var result = await Service.GetLearningStreakAsync(learnerId: 9999);

        // Assert
        result.Should().NotBeNull();
        result.CurrentStreak.Should().Be(0);
        result.LongestStreak.Should().Be(0);
    }

    [Fact]
    public async Task GetLearningStreakAsync_WhenMultipleLessonsCompletedSameDay_CountsAsSingleStreakDay()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);

        var baseTimeUtc = DateTime.UtcNow;

        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true, completedAt: baseTimeUtc);
        CreateLessonProgress(2, enr.EnrollmentId, lesson2.LessonId, isCompleted: true, completedAt: baseTimeUtc.AddSeconds(10));

        // Act
        var result = await Service.GetLearningStreakAsync(learnerId);

        // Assert
        result.Should().NotBeNull();
        result.CurrentStreak.Should().Be(1);
        result.LongestStreak.Should().Be(1);
    }
}
