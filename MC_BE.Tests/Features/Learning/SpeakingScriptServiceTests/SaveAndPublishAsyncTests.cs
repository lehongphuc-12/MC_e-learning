using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class SaveAndPublishAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task SaveAndPublishAsync_WhenNewScript_CreatesAndPublishesScriptWithLevels()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);

        var request = new SaveScriptRequest
        {
            Title = "Kịch bản bài 1",
            Scope = SpeakingScope.LESSON,
            PassingScore = 85.00m,
            Levels = new List<SaveLevelDto>
            {
                new() { Level = SpeakingLevel.BEGINNER, Content = "Lời thoại beginner" },
                new() { Level = SpeakingLevel.INTERMEDIATE, Content = "Lời thoại intermediate" },
                new() { Level = SpeakingLevel.ADVANCED, Content = "Lời thoại advanced" }
            }
        };

        // Act
        var result = await Service.SaveAndPublishAsync(lesson.LessonId, request, instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Kịch bản bài 1");
        result.Status.Should().Be("PUBLISHED");
        result.PassingScore.Should().Be(85.00m);
        result.Levels.Should().HaveCount(3);
    }

    [Fact]
    public async Task SaveAndPublishAsync_WhenScriptAlreadyExists_UpdatesExistingScript()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);
        var existingScript = CreateSpeakingScript(1, course.CourseId, lessonId: lesson.LessonId, title: "Old Title");
        CreateSpeakingScriptLevel(1, existingScript.ScriptId, SpeakingLevel.BEGINNER, "Old beginner");

        var request = new SaveScriptRequest
        {
            Title = "Updated Title",
            Scope = SpeakingScope.LESSON,
            PassingScore = 90.00m,
            Levels = new List<SaveLevelDto>
            {
                new() { Level = SpeakingLevel.BEGINNER, Content = "New beginner" },
                new() { Level = SpeakingLevel.INTERMEDIATE, Content = "New intermediate" },
                new() { Level = SpeakingLevel.ADVANCED, Content = "New advanced" }
            }
        };

        // Act
        var result = await Service.SaveAndPublishAsync(lesson.LessonId, request, instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Updated Title");
        result.PassingScore.Should().Be(90.00m);
        result.Levels.Should().HaveCount(3);
        result.Levels.Find(l => l.Level == "BEGINNER")!.Content.Should().Be("New beginner");
    }

    [Fact]
    public async Task SaveAndPublishAsync_WhenLessonNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var request = new SaveScriptRequest { Title = "Title" };

        // Act
        var act = () => Service.SaveAndPublishAsync(9999, request, 10);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Không tìm thấy bài học với ID 9999.");
    }

    [Fact]
    public async Task SaveAndPublishAsync_WhenUserNotInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);
        var request = new SaveScriptRequest { Title = "Title" };

        // Act
        var act = () => Service.SaveAndPublishAsync(lesson.LessonId, request, instructorId: 99);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý kịch bản cho khóa học này.");
    }

    [Fact]
    public async Task SaveAndPublishAsync_WhenPassingScoreNotProvided_DefaultsTo80()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var lesson = CreateLesson(1, course.CourseId);

        var request = new SaveScriptRequest
        {
            Title = "Default Score Test",
            Levels = new List<SaveLevelDto>
            {
                new() { Level = SpeakingLevel.BEGINNER, Content = "Beginner" },
                new() { Level = SpeakingLevel.INTERMEDIATE, Content = "Intermediate" },
                new() { Level = SpeakingLevel.ADVANCED, Content = "Advanced" }
            }
        };

        // Act
        var result = await Service.SaveAndPublishAsync(lesson.LessonId, request, instructorId);

        // Assert
        result.PassingScore.Should().Be(80.00m);
    }
}
