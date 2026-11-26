using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class GetScriptByLessonAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task GetScriptByLessonAsync_WhenScriptExists_ReturnsMappedDto()
    {
        // Arrange
        var course = CreateCourse(100);
        var lesson = CreateLesson(1, course.CourseId);
        var script = CreateSpeakingScript(10, course.CourseId, lessonId: lesson.LessonId, title: "Lesson Script");
        CreateSpeakingScriptLevel(1, script.ScriptId, SpeakingLevel.BEGINNER, "Beginner Content");

        // Act
        var result = await Service.GetScriptByLessonAsync(lesson.LessonId);

        // Assert
        result.Should().NotBeNull();
        result!.ScriptId.Should().Be(10);
        result.Title.Should().Be("Lesson Script");
        result.LessonId.Should().Be(lesson.LessonId);
        result.Levels.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetScriptByLessonAsync_WhenScriptDoesNotExist_ReturnsNull()
    {
        // Arrange
        var course = CreateCourse(100);
        var lesson = CreateLesson(1, course.CourseId);

        // Act
        var result = await Service.GetScriptByLessonAsync(lesson.LessonId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetScriptByLessonAsync_WhenNonExistentLessonId_ReturnsNull()
    {
        // Act
        var result = await Service.GetScriptByLessonAsync(9999);

        // Assert
        result.Should().BeNull();
    }
}
