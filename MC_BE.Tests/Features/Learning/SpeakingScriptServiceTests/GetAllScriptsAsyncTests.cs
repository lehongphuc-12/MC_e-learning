using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class GetAllScriptsAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task GetAllScriptsAsync_WhenFilteredByCourseAndScope_ReturnsMatchingScripts()
    {
        // Arrange
        var course1 = CreateCourse(100);
        var course2 = CreateCourse(200);

        CreateSpeakingScript(1, course1.CourseId, scope: SpeakingScope.LESSON, title: "Lesson Script");
        CreateSpeakingScript(2, course1.CourseId, scope: SpeakingScope.FINAL, title: "Final Script");
        CreateSpeakingScript(3, course2.CourseId, scope: SpeakingScope.LESSON, title: "Course 2 Script");

        // Act
        var result = await Service.GetAllScriptsAsync(course1.CourseId, SpeakingScope.LESSON, null, null, null);

        // Assert
        result.Should().HaveCount(1);
        result.First().ScriptId.Should().Be(1);
    }

    [Fact]
    public async Task GetAllScriptsAsync_WhenFilteredBySearchKeyword_ReturnsMatchingTitleOrContent()
    {
        // Arrange
        var course = CreateCourse(100);
        CreateSpeakingScript(1, course.CourseId, title: "Introduction to Public Speaking");
        CreateSpeakingScript(2, course.CourseId, title: "Advanced Debate Skills");

        // Act
        var result = await Service.GetAllScriptsAsync(null, null, null, null, "public speaking");

        // Assert
        result.Should().HaveCount(1);
        result.First().Title.Should().Be("Introduction to Public Speaking");
    }

    [Fact]
    public async Task GetAllScriptsAsync_WhenNoScriptsMatchFilters_ReturnsEmptyList()
    {
        // Arrange
        var course = CreateCourse(100);
        CreateSpeakingScript(1, course.CourseId, title: "Sample");

        // Act
        var result = await Service.GetAllScriptsAsync(null, null, null, null, "NonExistentKeyword999");

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAllScriptsAsync_WhenAllFiltersNull_ReturnsAllScripts()
    {
        // Arrange
        var course = CreateCourse(100);
        CreateSpeakingScript(1, course.CourseId, title: "Script 1");
        CreateSpeakingScript(2, course.CourseId, title: "Script 2");

        // Act
        var result = await Service.GetAllScriptsAsync(null, null, null, null, null);

        // Assert
        result.Should().HaveCount(2);
    }
}
