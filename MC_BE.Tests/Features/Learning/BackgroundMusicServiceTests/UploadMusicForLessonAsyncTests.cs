using System;
using System.IO;
using System.Threading.Tasks;
using CloudinaryDotNet.Actions;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Learning.BackgroundMusicServiceTests;

public class UploadMusicForLessonAsyncTests : BackgroundMusicServiceTestBase
{
    [Fact]
    public async Task UploadMusicForLessonAsync_WhenValidInputAndAuthorized_UploadsSuccessfully()
    {
        // Arrange
        var instructorId = 1;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(10, course.CourseId);

        var file = CreateMockAudioFile("ambient.mp3", 2 * 1024 * 1024);
        var title = "  Ambient Relax  ";

        var uploadResult = new VideoUploadResult
        {
            SecureUrl = new Uri("https://cloudinary.com/audio/ambient.mp3"),
            PublicId = "bgm_ambient_123"
        };

        CloudinaryMock
            .Setup(c => c.UploadVideoAsync(file, $"background-music/lesson-{lesson.LessonId}"))
            .ReturnsAsync(uploadResult);

        // Act
        var result = await Service.UploadMusicForLessonAsync(lesson.LessonId, file, title, instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Ambient Relax");
        result.AudioUrl.Should().Be("https://cloudinary.com/audio/ambient.mp3");
        result.IsSystemDefault.Should().BeFalse();
        result.LessonId.Should().Be(lesson.LessonId);

        var dbRecord = await DbContext.BackgroundMusics.FirstOrDefaultAsync(m => m.MusicId == result.MusicId);
        dbRecord.Should().NotBeNull();
        dbRecord!.Title.Should().Be("Ambient Relax");
        dbRecord.CloudinaryPublicId.Should().Be("bgm_ambient_123");
        dbRecord.IsSystemDefault.Should().BeFalse();
    }

    [Fact]
    public async Task UploadMusicForLessonAsync_WhenFileIsNull_ThrowsArgumentException()
    {
        // Arrange
        IFormFile? file = null;

        // Act
        var act = () => Service.UploadMusicForLessonAsync(1, file!, "Title", 1);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Vui lòng tải lên tập tin âm thanh.");
    }

    [Fact]
    public async Task UploadMusicForLessonAsync_WhenFileExtensionInvalid_ThrowsArgumentException()
    {
        // Arrange
        var file = CreateMockAudioFile("presentation.pdf", 1024);

        // Act
        var act = () => Service.UploadMusicForLessonAsync(1, file, "Title", 1);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Định dạng tập tin không hợp lệ. Chỉ chấp nhận các định dạng: .mp3, .wav, .ogg, .m4a.");
    }

    [Fact]
    public async Task UploadMusicForLessonAsync_WhenLessonNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var file = CreateMockAudioFile("music.mp3", 1024);

        // Act
        var act = () => Service.UploadMusicForLessonAsync(999, file, "Title", 1);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Không tìm thấy bài học tương ứng.");
    }

    [Fact]
    public async Task UploadMusicForLessonAsync_WhenUserIsNotCourseInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var course = CreateCourse(1, instructorId: 10);
        var lesson = CreateLesson(5, course.CourseId);
        var file = CreateMockAudioFile("music.mp3", 1024);
        var differentInstructorId = 99;

        // Act
        var act = () => Service.UploadMusicForLessonAsync(lesson.LessonId, file, "Title", differentInstructorId);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý nhạc nền cho bài học này.");
    }

    [Fact]
    public async Task UploadMusicForLessonAsync_WhenCloudinaryUploadFails_ThrowsInvalidOperationException()
    {
        // Arrange
        var instructorId = 1;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(5, course.CourseId);
        var file = CreateMockAudioFile("music.mp3", 1024);

        var uploadResult = new VideoUploadResult
        {
            Error = new Error { Message = "Cloud storage limit reached" }
        };

        CloudinaryMock
            .Setup(c => c.UploadVideoAsync(file, It.IsAny<string>()))
            .ReturnsAsync(uploadResult);

        // Act
        var act = () => Service.UploadMusicForLessonAsync(lesson.LessonId, file, "Title", instructorId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Không thể tải tập tin nhạc lên máy chủ lưu trữ.");
    }

    [Fact]
    public async Task UploadMusicForLessonAsync_WhenFileLengthExceeds5MB_ThrowsArgumentException()
    {
        // Arrange
        var file = CreateMockAudioFile("heavy.mp3", 5 * 1024 * 1024 + 1);

        // Act
        var act = () => Service.UploadMusicForLessonAsync(1, file, "Title", 1);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Dung lượng tập tin nhạc không được vượt quá 5MB.");
    }

    [Fact]
    public async Task UploadMusicForLessonAsync_WhenTitleIsEmptyOrWhitespace_UsesFileNameWithoutExtension()
    {
        // Arrange
        var instructorId = 1;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(5, course.CourseId);
        var file = CreateMockAudioFile("piano_melody.wav", 1024);

        var uploadResult = new VideoUploadResult
        {
            SecureUrl = new Uri("https://cloudinary.com/audio/piano_melody.wav"),
            PublicId = "piano_123"
        };

        CloudinaryMock
            .Setup(c => c.UploadVideoAsync(file, It.IsAny<string>()))
            .ReturnsAsync(uploadResult);

        // Act
        var result = await Service.UploadMusicForLessonAsync(lesson.LessonId, file, "   ", instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("piano_melody");
    }
}
