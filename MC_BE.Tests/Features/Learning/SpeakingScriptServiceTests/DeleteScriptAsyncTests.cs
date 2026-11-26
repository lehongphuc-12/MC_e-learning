using System;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class DeleteScriptAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task DeleteScriptAsync_WhenScriptExistsAndAuthorized_DeletesAndReturnsTrue()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);
        var script = CreateSpeakingScript(1, course.CourseId, lessonId: lesson.LessonId);

        // Act
        var result = await Service.DeleteScriptAsync(lesson.LessonId, instructorId);

        // Assert
        result.Should().BeTrue();
        var inDb = await DbContext.SpeakingScripts.FindAsync(script.ScriptId);
        inDb.Should().BeNull();
    }

    [Fact]
    public async Task DeleteScriptAsync_WhenLessonNotFound_ThrowsKeyNotFoundException()
    {
        // Act
        var act = () => Service.DeleteScriptAsync(9999, 10);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Không tìm thấy bài học với ID 9999.");
    }

    [Fact]
    public async Task DeleteScriptAsync_WhenUserNotInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);

        // Act
        var act = () => Service.DeleteScriptAsync(lesson.LessonId, instructorId: 99);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý kịch bản cho khóa học này.");
    }

    [Fact]
    public async Task DeleteScriptAsync_WhenScriptDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);

        // Act
        var result = await Service.DeleteScriptAsync(lesson.LessonId, instructorId);

        // Assert
        result.Should().BeFalse();
    }
}
