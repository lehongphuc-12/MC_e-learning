using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningAccessServiceTests;

public class CheckLessonAsyncTests : LearningAccessServiceTestBase
{
    [Fact]
    public async Task CheckLessonAsync_WhenEnrolledAndLessonUnlocked_ReturnsAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);

        // Act
        var (allowed, reason) = await Service.CheckLessonAsync(learnerId, lesson.LessonId);

        // Assert
        allowed.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public async Task CheckLessonAsync_WhenLessonNotFound_ReturnsNotAllowed()
    {
        // Act
        var (allowed, reason) = await Service.CheckLessonAsync(1, 9999);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Không tìm thấy bài học.");
    }

    [Fact]
    public async Task CheckLessonAsync_WhenLearnerNotEnrolled_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var lesson = CreateLesson(1, course.CourseId);
        // Learner has enrollment with status "PENDING_PAYMENT"
        CreateEnrollment(1, learnerId, course.CourseId, status: "PENDING_PAYMENT");

        // Act
        var (allowed, reason) = await Service.CheckLessonAsync(learnerId, lesson.LessonId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Bạn cần đăng ký khóa học để tiếp tục.");
    }

    [Fact]
    public async Task CheckLessonAsync_WhenPrerequisiteLessonIncomplete_ReturnsNotAllowedWithLockReason()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);
        CreateLessonVideoMaterial(10, course.CourseId, lesson1.LessonId);

        // Act
        var (allowed, reason) = await Service.CheckLessonAsync(learnerId, lesson2.LessonId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be($"Vui lòng hoàn thành video của bài học {lesson1.LessonId} trước.");
    }

    [Fact]
    public async Task CheckLessonAsync_WhenLessonStatusIsNotActive_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var inactiveLesson = CreateLesson(1, course.CourseId, status: LessonStatus.INACTIVE);

        // Act
        var (allowed, reason) = await Service.CheckLessonAsync(learnerId, inactiveLesson.LessonId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Bài học không còn hoạt động.");
    }
}
