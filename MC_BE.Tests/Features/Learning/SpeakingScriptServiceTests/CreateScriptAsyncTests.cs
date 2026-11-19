using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class CreateScriptAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task CreateScriptAsync_WhenLessonScopeAndAuthorized_CreatesScriptWithModuleAndLesson()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var mod = CreateModule(1, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId, mod.ModuleId);

        var request = new CreateSpeakingScriptRequest
        {
            CourseId = course.CourseId,
            Scope = SpeakingScope.LESSON,
            ModuleId = mod.ModuleId,
            LessonId = lesson.LessonId,
            Title = "Lesson Level Script",
            PassingScore = 85.00m,
            Levels = new List<SaveLevelDto>
            {
                new() { Level = SpeakingLevel.BEGINNER, Content = "Beginner" },
                new() { Level = SpeakingLevel.INTERMEDIATE, Content = "Intermediate" },
                new() { Level = SpeakingLevel.ADVANCED, Content = "Advanced" }
            }
        };

        // Act
        var result = await Service.CreateScriptAsync(request, instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Scope.Should().Be("LESSON");
        result.LessonId.Should().Be(lesson.LessonId);
        result.ModuleId.Should().Be(mod.ModuleId);
        result.PassingScore.Should().Be(85.00m);
    }

    [Fact]
    public async Task CreateScriptAsync_WhenChapterScopeAndAuthorized_CreatesScriptWithModuleOnly()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var mod = CreateModule(1, course.CourseId);

        var request = new CreateSpeakingScriptRequest
        {
            CourseId = course.CourseId,
            Scope = SpeakingScope.CHAPTER,
            ModuleId = mod.ModuleId,
            LessonId = 55, // Should be cleared for CHAPTER scope
            Title = "Chapter Level Script",
            Levels = new List<SaveLevelDto>
            {
                new() { Level = SpeakingLevel.BEGINNER, Content = "Beginner" },
                new() { Level = SpeakingLevel.INTERMEDIATE, Content = "Intermediate" },
                new() { Level = SpeakingLevel.ADVANCED, Content = "Advanced" }
            }
        };

        // Act
        var result = await Service.CreateScriptAsync(request, instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Scope.Should().Be("CHAPTER");
        result.ModuleId.Should().Be(mod.ModuleId);
        result.LessonId.Should().BeNull(); // Verified cleared
    }

    [Fact]
    public async Task CreateScriptAsync_WhenFinalScopeAndAuthorized_CreatesScriptWithCourseOnly()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);

        var request = new CreateSpeakingScriptRequest
        {
            CourseId = course.CourseId,
            Scope = SpeakingScope.FINAL,
            ModuleId = 12, // Should be cleared for FINAL scope
            LessonId = 34, // Should be cleared for FINAL scope
            Title = "Final Level Script",
            Levels = new List<SaveLevelDto>
            {
                new() { Level = SpeakingLevel.BEGINNER, Content = "Beginner" },
                new() { Level = SpeakingLevel.INTERMEDIATE, Content = "Intermediate" },
                new() { Level = SpeakingLevel.ADVANCED, Content = "Advanced" }
            }
        };

        // Act
        var result = await Service.CreateScriptAsync(request, instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Scope.Should().Be("FINAL");
        result.ModuleId.Should().BeNull();
        result.LessonId.Should().BeNull();
    }

    [Fact]
    public async Task CreateScriptAsync_WhenCourseNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var request = new CreateSpeakingScriptRequest
        {
            CourseId = 9999,
            Title = "Script"
        };

        // Act
        var act = () => Service.CreateScriptAsync(request, 10);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Không tìm thấy khóa học với ID 9999.");
    }

    [Fact]
    public async Task CreateScriptAsync_WhenUserNotInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var request = new CreateSpeakingScriptRequest
        {
            CourseId = course.CourseId,
            Title = "Script"
        };

        // Act
        var act = () => Service.CreateScriptAsync(request, instructorId: 99);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý kịch bản cho khóa học này.");
    }

    [Fact]
    public async Task CreateScriptAsync_WhenPassingScoreZeroOrNegative_DefaultsTo80()
    {
        // Arrange
        var instructorId = 10;
        var course = CreateCourse(100, instructorId);
        var request = new CreateSpeakingScriptRequest
        {
            CourseId = course.CourseId,
            Scope = SpeakingScope.FINAL,
            Title = "Default Passing Score Script",
            PassingScore = 0m,
            Levels = new List<SaveLevelDto>
            {
                new() { Level = SpeakingLevel.BEGINNER, Content = "Beginner" },
                new() { Level = SpeakingLevel.INTERMEDIATE, Content = "Intermediate" },
                new() { Level = SpeakingLevel.ADVANCED, Content = "Advanced" }
            }
        };

        // Act
        var result = await Service.CreateScriptAsync(request, instructorId);

        // Assert
        result.PassingScore.Should().Be(80.00m);
    }
}
