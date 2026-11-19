using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class GetScriptsByCourseAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task GetScriptsByCourseAsync_WhenScriptsExistForCourse_ReturnsCourseScripts()
    {
        // Arrange
        var course1 = CreateCourse(100);
        var course2 = CreateCourse(200);

        CreateSpeakingScript(1, course1.CourseId, title: "Course 1 Script A");
        CreateSpeakingScript(2, course1.CourseId, title: "Course 1 Script B");
        CreateSpeakingScript(3, course2.CourseId, title: "Course 2 Script");

        // Act
        var result = await Service.GetScriptsByCourseAsync(course1.CourseId);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(s => s.CourseId.Should().Be(course1.CourseId));
    }

    [Fact]
    public async Task GetScriptsByCourseAsync_WhenCourseHasNoScripts_ReturnsEmptyList()
    {
        // Arrange
        var course = CreateCourse(100);

        // Act
        var result = await Service.GetScriptsByCourseAsync(course.CourseId);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetScriptsByCourseAsync_WhenCourseIdNonExistent_ReturnsEmptyList()
    {
        // Act
        var result = await Service.GetScriptsByCourseAsync(9999);

        // Assert
        result.Should().BeEmpty();
    }
}
