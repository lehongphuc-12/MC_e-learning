using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class GetLevelContentAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task GetLevelContentAsync_WhenLevelExists_ReturnsLevelDto()
    {
        // Arrange
        var course = CreateCourse(100);
        var lesson = CreateLesson(1, course.CourseId);
        var script = CreateSpeakingScript(10, course.CourseId, lessonId: lesson.LessonId);
        CreateSpeakingScriptLevel(1, script.ScriptId, SpeakingLevel.INTERMEDIATE, "Intermediate Level Content");

        // Act
        var result = await Service.GetLevelContentAsync(lesson.LessonId, SpeakingLevel.INTERMEDIATE);

        // Assert
        result.Should().NotBeNull();
        result!.Level.Should().Be("INTERMEDIATE");
        result.Content.Should().Be("Intermediate Level Content");
    }

    [Fact]
    public async Task GetLevelContentAsync_WhenLevelDoesNotExist_ReturnsNull()
    {
        // Arrange
        var course = CreateCourse(100);
        var lesson = CreateLesson(1, course.CourseId);
        var script = CreateSpeakingScript(10, course.CourseId, lessonId: lesson.LessonId);
        // Only Beginner exists
        CreateSpeakingScriptLevel(1, script.ScriptId, SpeakingLevel.BEGINNER, "Beginner Content");

        // Act
        var result = await Service.GetLevelContentAsync(lesson.LessonId, SpeakingLevel.ADVANCED);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLevelContentAsync_WhenLessonHasNoScript_ReturnsNull()
    {
        // Act
        var result = await Service.GetLevelContentAsync(9999, SpeakingLevel.BEGINNER);

        // Assert
        result.Should().BeNull();
    }
}
