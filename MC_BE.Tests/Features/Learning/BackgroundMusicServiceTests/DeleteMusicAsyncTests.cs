using System;
using System.Threading.Tasks;
using CloudinaryDotNet.Actions;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Learning.BackgroundMusicServiceTests;

public class DeleteMusicAsyncTests : BackgroundMusicServiceTestBase
{
    [Fact]
    public async Task DeleteMusicAsync_WhenValidCustomMusicAndAuthorized_DeletesRecordAndCloudinaryFile()
    {
        // Arrange
        var instructorId = 1;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(10, course.CourseId);
        var music = CreateBackgroundMusic(100, "Custom Track", "https://audio.com/custom.mp3",
            isSystemDefault: false, lessonId: lesson.LessonId, cloudinaryPublicId: "cloud_bgm_100");

        CloudinaryMock
            .Setup(c => c.DeleteFileAsync("cloud_bgm_100", ResourceType.Video))
            .ReturnsAsync(new DeletionResult { Result = "ok" });

        // Act
        var result = await Service.DeleteMusicAsync(music.MusicId, instructorId);

        // Assert
        result.Should().BeTrue();
        CloudinaryMock.Verify(c => c.DeleteFileAsync("cloud_bgm_100", ResourceType.Video), Times.Once);

        var dbRecord = await DbContext.BackgroundMusics.FindAsync(music.MusicId);
        dbRecord.Should().BeNull();
    }

    [Fact]
    public async Task DeleteMusicAsync_WhenMusicNotFound_ReturnsFalse()
    {
        // Act
        var result = await Service.DeleteMusicAsync(999, instructorId: 1);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteMusicAsync_WhenMusicIsSystemDefault_ThrowsInvalidOperationException()
    {
        // Arrange
        var defaultMusic = CreateBackgroundMusic(200, "Default Track", "https://audio.com/def.mp3", isSystemDefault: true);

        // Act
        var act = () => Service.DeleteMusicAsync(defaultMusic.MusicId, instructorId: 1);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Không thể xóa nhạc nền mặc định của hệ thống.");
    }

    [Fact]
    public async Task DeleteMusicAsync_WhenUserNotCourseInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var instructorId = 10;
        var unauthorizedUser = 99;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(10, course.CourseId);
        var music = CreateBackgroundMusic(101, "Custom Track", "https://audio.com/custom.mp3",
            isSystemDefault: false, lessonId: lesson.LessonId);

        // Act
        var act = () => Service.DeleteMusicAsync(music.MusicId, unauthorizedUser);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền xóa nhạc nền này.");
    }

    [Fact]
    public async Task DeleteMusicAsync_WhenCloudinaryPublicIdIsNullOrEmpty_DeletesWithoutCallingCloudinary()
    {
        // Arrange
        var instructorId = 1;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(10, course.CourseId);
        var music = CreateBackgroundMusic(102, "No Cloudinary ID", "https://audio.com/audio.mp3",
            isSystemDefault: false, lessonId: lesson.LessonId, cloudinaryPublicId: null);

        // Act
        var result = await Service.DeleteMusicAsync(music.MusicId, instructorId);

        // Assert
        result.Should().BeTrue();
        CloudinaryMock.Verify(c => c.DeleteFileAsync(It.IsAny<string>(), It.IsAny<ResourceType>()), Times.Never);

        var dbRecord = await DbContext.BackgroundMusics.FindAsync(music.MusicId);
        dbRecord.Should().BeNull();
    }

    [Fact]
    public async Task DeleteMusicAsync_WhenCloudinaryDeleteThrowsException_CatchesExceptionAndStillDeletesFromDb()
    {
        // Arrange
        var instructorId = 1;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(10, course.CourseId);
        var music = CreateBackgroundMusic(103, "Cloudinary Fail", "https://audio.com/audio.mp3",
            isSystemDefault: false, lessonId: lesson.LessonId, cloudinaryPublicId: "failing_public_id");

        CloudinaryMock
            .Setup(c => c.DeleteFileAsync("failing_public_id", ResourceType.Video))
            .ThrowsAsync(new Exception("Cloudinary connection timeout"));

        // Act
        var result = await Service.DeleteMusicAsync(music.MusicId, instructorId);

        // Assert
        result.Should().BeTrue();
        var dbRecord = await DbContext.BackgroundMusics.FindAsync(music.MusicId);
        dbRecord.Should().BeNull();
    }

    [Fact]
    public async Task DeleteMusicAsync_WhenLessonOrCourseIsNull_DeletesSuccessfully()
    {
        // Arrange
        var music = CreateBackgroundMusic(104, "Orphaned Custom Track", "https://audio.com/audio.mp3",
            isSystemDefault: false, lessonId: null);

        // Act
        var result = await Service.DeleteMusicAsync(music.MusicId, instructorId: 1);

        // Assert
        result.Should().BeTrue();
        var dbRecord = await DbContext.BackgroundMusics.FindAsync(music.MusicId);
        dbRecord.Should().BeNull();
    }
}
