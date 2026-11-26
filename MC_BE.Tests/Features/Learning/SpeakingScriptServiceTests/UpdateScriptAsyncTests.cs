using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class UpdateScriptAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task UpdateScriptAsync_WhenSwitchingToFinalScope_ClearsModuleAndLesson()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var mod = CreateModule(1, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId, mod.ModuleId);
        var script = CreateSpeakingScript(1, course.CourseId, scope: SpeakingScope.LESSON, moduleId: mod.ModuleId, lessonId: lesson.LessonId);

        var request = new UpdateSpeakingScriptRequest
        {
            Scope = SpeakingScope.FINAL
        };

        // Act
        var result = await Service.UpdateScriptAsync(script.ScriptId, request, instructorId);

        // Assert
        result.Scope.Should().Be("FINAL");
        result.ModuleId.Should().BeNull();
        result.LessonId.Should().BeNull();
    }

    [Fact]
    public async Task UpdateScriptAsync_WhenSwitchingToChapterScope_SetsModuleAndClearsLesson()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var mod = CreateModule(1, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId, mod.ModuleId);
        var script = CreateSpeakingScript(1, course.CourseId, scope: SpeakingScope.LESSON, moduleId: mod.ModuleId, lessonId: lesson.LessonId);

        var newMod = CreateModule(2, course.CourseId);

        var request = new UpdateSpeakingScriptRequest
        {
            Scope = SpeakingScope.CHAPTER,
            ModuleId = newMod.ModuleId
        };

        // Act
        var result = await Service.UpdateScriptAsync(script.ScriptId, request, instructorId);

        // Assert
        result.Scope.Should().Be("CHAPTER");
        result.ModuleId.Should().Be(newMod.ModuleId);
        result.LessonId.Should().BeNull();
    }

    [Fact]
    public async Task UpdateScriptAsync_WhenScriptNotFound_ThrowsKeyNotFoundException()
    {
        // Act
        var act = () => Service.UpdateScriptAsync(9999, new UpdateSpeakingScriptRequest(), 10);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Không tìm thấy kịch bản với ID 9999.");
    }

    [Fact]
    public async Task UpdateScriptAsync_WhenUserNotInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var script = CreateSpeakingScript(1, course.CourseId);

        // Act
        var act = () => Service.UpdateScriptAsync(script.ScriptId, new UpdateSpeakingScriptRequest(), instructorId: 99);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý kịch bản cho khóa học này.");
    }

    [Fact]
    public async Task UpdateScriptAsync_WhenUpdatingTitleAndPassingScore_UpdatesPropertiesSuccessfully()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var script = CreateSpeakingScript(1, course.CourseId, title: "Old Title", passingScore: 80.00m);

        var request = new UpdateSpeakingScriptRequest
        {
            Title = "Updated Title",
            PassingScore = 95.00m
        };

        // Act
        var result = await Service.UpdateScriptAsync(script.ScriptId, request, instructorId);

        // Assert
        result.Title.Should().Be("Updated Title");
        result.PassingScore.Should().Be(95.00m);
    }
}
