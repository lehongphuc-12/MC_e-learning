using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class UpdateLevelContentAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task UpdateLevelContentAsync_WhenLevelExistsAndAuthorized_UpdatesLevelContent()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var script = CreateSpeakingScript(1, course.CourseId);
        CreateSpeakingScriptLevel(1, script.ScriptId, SpeakingLevel.BEGINNER, "Old Content");

        var request = new UpdateLevelContentRequest
        {
            Content = "Updated Content",
            CleanScriptForScoring = "Clean Content"
        };

        // Act
        var result = await Service.UpdateLevelContentAsync(script.ScriptId, SpeakingLevel.BEGINNER, request, instructorId);

        // Assert
        result.Should().NotBeNull();
        var lvl = result!.Levels.Find(l => l.Level == "BEGINNER");
        lvl.Should().NotBeNull();
        lvl!.Content.Should().Be("Updated Content");
        lvl.CleanScriptForScoring.Should().Be("Clean Content");
    }

    [Fact]
    public async Task UpdateLevelContentAsync_WhenLevelDoesNotExist_AddsNewLevelToScript()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var script = CreateSpeakingScript(1, course.CourseId);

        var request = new UpdateLevelContentRequest
        {
            Content = "New Level Content"
        };

        // Act
        var result = await Service.UpdateLevelContentAsync(script.ScriptId, SpeakingLevel.ADVANCED, request, instructorId);

        // Assert
        result.Should().NotBeNull();
        var lvl = result!.Levels.Find(l => l.Level == "ADVANCED");
        lvl.Should().NotBeNull();
        lvl!.Content.Should().Be("New Level Content");
    }

    [Fact]
    public async Task UpdateLevelContentAsync_WhenScriptNotFound_ReturnsNull()
    {
        // Act
        var result = await Service.UpdateLevelContentAsync(9999, SpeakingLevel.BEGINNER, new UpdateLevelContentRequest { Content = "Test" }, 1);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateLevelContentAsync_WhenUserNotInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var instructorId = 10;
        var unauthorizedUser = 99;
        var course = CreateCourse(100, instructorId);
        var script = CreateSpeakingScript(1, course.CourseId);

        // Act
        var act = () => Service.UpdateLevelContentAsync(script.ScriptId, SpeakingLevel.BEGINNER, new UpdateLevelContentRequest { Content = "Test" }, unauthorizedUser);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý kịch bản cho khóa học này.");
    }

    [Fact]
    public async Task UpdateLevelContentAsync_WhenCleanScriptNotProvided_ExtractsCleanScriptAutomatically()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var script = CreateSpeakingScript(1, course.CourseId);

        var request = new UpdateLevelContentRequest
        {
            Content = "Xin chào [HƯỚNG DẪN: cười] các bạn."
        };

        // Act
        var result = await Service.UpdateLevelContentAsync(script.ScriptId, SpeakingLevel.BEGINNER, request, instructorId);

        // Assert
        result.Should().NotBeNull();
        var lvl = result!.Levels.Find(l => l.Level == "BEGINNER");
        lvl!.CleanScriptForScoring.Should().Be("Xin chào các bạn.");
    }
}
