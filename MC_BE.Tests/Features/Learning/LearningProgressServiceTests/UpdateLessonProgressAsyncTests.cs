using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningProgressServiceTests;

public class UpdateLessonProgressAsyncTests : LearningProgressServiceTestBase
{
    [Fact]
    public async Task UpdateLessonProgressAsync_WhenCompletingLessonReaches100Percent_AutoIssuesCertificate()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);

        var request = new UpdateLessonProgressRequest
        {
            IsCompleted = true,
            LastPositionSeconds = 600,
            TimeSpentSeconds = 600
        };

        // Act
        var result = await Service.UpdateLessonProgressAsync(learnerId, lesson.LessonId, request);

        // Assert
        result.Should().NotBeNull();
        result!.CompletionPercentage.Should().Be(100.00m);
        result.CompletedLessonsCount.Should().Be(1);
        CertificateServiceMock.Verify(c => c.IssueCertificateAsync(learnerId, course.CourseId), Times.Once);
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_WhenUpdatingPositionAndTimeSpent_UpdatesProgressWithoutCompleting()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);

        var request = new UpdateLessonProgressRequest
        {
            IsCompleted = false,
            LastPositionSeconds = 150,
            TimeSpentSeconds = 300
        };

        // Act
        var result = await Service.UpdateLessonProgressAsync(learnerId, lesson1.LessonId, request);

        // Assert
        result.Should().NotBeNull();
        result!.CompletionPercentage.Should().Be(0m);
        var lessonProgress = result.LessonProgresses.Find(lp => lp.LessonId == lesson1.LessonId);
        lessonProgress.Should().NotBeNull();
        lessonProgress!.IsCompleted.Should().BeFalse();
        lessonProgress.LastPositionSeconds.Should().Be(150);
        lessonProgress.TimeSpentSeconds.Should().Be(300);
        lessonProgress.TimeSpentMinutes.Should().Be(5);
        CertificateServiceMock.Verify(c => c.IssueCertificateAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_WhenLessonNotFound_ReturnsNull()
    {
        // Act
        var result = await Service.UpdateLessonProgressAsync(1, 9999, new UpdateLessonProgressRequest());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_WhenCourseAccessDenied_ReturnsNull()
    {
        // Arrange
        var course = CreateCourse(100);
        var lesson = CreateLesson(1, course.CourseId);
        CourseAccessMock
            .Setup(c => c.CanAccessCourseAsync(course.CourseId, 1, false))
            .ReturnsAsync(false);

        // Act
        var result = await Service.UpdateLessonProgressAsync(1, lesson.LessonId, new UpdateLessonProgressRequest());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_WhenActiveEnrollmentNotFoundOrExpired_ReturnsNull()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var lesson = CreateLesson(1, course.CourseId);
        // Expired enrollment
        CreateEnrollment(1, learnerId, course.CourseId, status: "ACTIVE", expiresAt: DateTime.UtcNow.AddDays(-1));

        // Act
        var result = await Service.UpdateLessonProgressAsync(learnerId, lesson.LessonId, new UpdateLessonProgressRequest());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_WhenLessonAccessLocked_ThrowsInvalidOperationException()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);

        AccessMock
            .Setup(a => a.CheckLessonAsync(learnerId, lesson.LessonId))
            .ReturnsAsync((false, "Vui lòng hoàn thành bài trước."));

        // Act
        var act = () => Service.UpdateLessonProgressAsync(learnerId, lesson.LessonId, new UpdateLessonProgressRequest());

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Vui lòng hoàn thành bài trước.");
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_WhenNegativePositionProvided_NormalizesToZero()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);

        var request = new UpdateLessonProgressRequest
        {
            LastPositionSeconds = -100
        };

        // Act
        var result = await Service.UpdateLessonProgressAsync(learnerId, lesson.LessonId, request);

        // Assert
        result.Should().NotBeNull();
        var lp = result!.LessonProgresses.Find(p => p.LessonId == lesson.LessonId);
        lp!.LastPositionSeconds.Should().Be(0);
    }

    [Fact]
    public async Task UpdateLessonProgressAsync_WhenTimeSpentIsLessThanExisting_KeepsExistingTimeSpent()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: false, timeSpentSeconds: 500);

        var request = new UpdateLessonProgressRequest
        {
            TimeSpentSeconds = 200 // Lower than existing 500
        };

        // Act
        var result = await Service.UpdateLessonProgressAsync(learnerId, lesson.LessonId, request);

        // Assert
        result.Should().NotBeNull();
        var lp = result!.LessonProgresses.Find(p => p.LessonId == lesson.LessonId);
        lp!.TimeSpentSeconds.Should().Be(500); // Math.Max preserves 500
    }
}
