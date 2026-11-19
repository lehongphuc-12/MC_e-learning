using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class ParseScriptFileAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task ParseScriptFileAsync_WhenValidFileAndAuthorized_ReturnsPreview()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);
        var file = CreateMockTxtFile("script.txt", "[LEVEL: BEGINNER]\nXin chào các bạn.");

        // Act
        var result = await Service.ParseScriptFileAsync(lesson.LessonId, file, instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ParseScriptFileAsync_WhenLessonNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var file = CreateMockTxtFile("script.txt", "Content");

        // Act
        var act = () => Service.ParseScriptFileAsync(9999, file, 10);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Không tìm thấy bài học với ID 9999.");
    }

    [Fact]
    public async Task ParseScriptFileAsync_WhenUserNotInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var instructorId = 10;
        var unauthorizedUser = 99;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);
        var file = CreateMockTxtFile("script.txt", "Content");

        // Act
        var act = () => Service.ParseScriptFileAsync(lesson.LessonId, file, unauthorizedUser);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý kịch bản cho khóa học này.");
    }
}
