using System;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class DeleteScriptByIdAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task DeleteScriptByIdAsync_WhenScriptExistsAndAuthorized_DeletesAndReturnsTrue()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var script = CreateSpeakingScript(1, course.CourseId);

        // Act
        var result = await Service.DeleteScriptByIdAsync(script.ScriptId, instructorId);

        // Assert
        result.Should().BeTrue();
        var inDb = await DbContext.SpeakingScripts.FindAsync(script.ScriptId);
        inDb.Should().BeNull();
    }

    [Fact]
    public async Task DeleteScriptByIdAsync_WhenScriptNotFound_ReturnsFalse()
    {
        // Act
        var result = await Service.DeleteScriptByIdAsync(9999, 10);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteScriptByIdAsync_WhenUserNotInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var script = CreateSpeakingScript(1, course.CourseId);

        // Act
        var act = () => Service.DeleteScriptByIdAsync(script.ScriptId, instructorId: 99);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý kịch bản cho khóa học này.");
    }

    [Fact]
    public async Task DeleteScriptByIdAsync_WhenValidScript_DeletesSuccessfullyAndRemovesFromDb()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);
        var script = CreateSpeakingScript(50, course.CourseId, lessonId: lesson.LessonId);

        // Act
        var result = await Service.DeleteScriptByIdAsync(script.ScriptId, instructorId);

        // Assert
        result.Should().BeTrue();
        var inDb = await DbContext.SpeakingScripts.FindAsync(script.ScriptId);
        inDb.Should().BeNull();
    }
}
