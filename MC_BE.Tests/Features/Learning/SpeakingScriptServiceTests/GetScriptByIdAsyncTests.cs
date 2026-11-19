using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class GetScriptByIdAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task GetScriptByIdAsync_WhenScriptExists_ReturnsDto()
    {
        // Arrange
        var course = CreateCourse(100);
        var script = CreateSpeakingScript(1, course.CourseId, title: "Detailed Script");
        CreateSpeakingScriptLevel(1, script.ScriptId, SpeakingLevel.BEGINNER, "Beginner Content");

        // Act
        var result = await Service.GetScriptByIdAsync(script.ScriptId);

        // Assert
        result.Should().NotBeNull();
        result!.ScriptId.Should().Be(1);
        result.Title.Should().Be("Detailed Script");
        result.Levels.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetScriptByIdAsync_WhenScriptDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await Service.GetScriptByIdAsync(9999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetScriptByIdAsync_WhenScriptIdIsZero_ReturnsNull()
    {
        // Act
        var result = await Service.GetScriptByIdAsync(0);

        // Assert
        result.Should().BeNull();
    }
}
