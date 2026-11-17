using System;
using System.Threading.Tasks;
using CloudinaryDotNet.Actions;
using FluentAssertions;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Learning.BackgroundMusicServiceTests;

public class PreUploadMusicAsyncTests : BackgroundMusicServiceTestBase
{
    [Fact]
    public async Task PreUploadMusicAsync_WhenValidFileAndTitle_ReturnsPreUploadResult()
    {
        // Arrange
        var file = CreateMockAudioFile("guitar.ogg", 1024 * 500);
        var title = "  Acoustic Guitar  ";

        var uploadResult = new VideoUploadResult
        {
            SecureUrl = new Uri("https://cloudinary.com/audio/guitar.ogg"),
            PublicId = "bgm_guitar_123"
        };

        CloudinaryMock
            .Setup(c => c.UploadVideoAsync(file, "background-music/custom-uploads"))
            .ReturnsAsync(uploadResult);

        // Act
        var result = await Service.PreUploadMusicAsync(file, title, instructorId: 1);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Acoustic Guitar");
        result.AudioUrl.Should().Be("https://cloudinary.com/audio/guitar.ogg");
        result.CloudinaryPublicId.Should().Be("bgm_guitar_123");
    }

    [Fact]
    public async Task PreUploadMusicAsync_WhenFileLengthIsZero_ThrowsArgumentException()
    {
        // Arrange
        var file = CreateMockAudioFile("empty.mp3", 0);

        // Act
        var act = () => Service.PreUploadMusicAsync(file, "Title", 1);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Vui lòng tải lên tập tin âm thanh.");
    }

    [Fact]
    public async Task PreUploadMusicAsync_WhenFileExtensionNotAllowed_ThrowsArgumentException()
    {
        // Arrange
        var file = CreateMockAudioFile("script.sh", 1024);

        // Act
        var act = () => Service.PreUploadMusicAsync(file, "Title", 1);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Định dạng tập tin không hợp lệ. Chỉ chấp nhận các định dạng: .mp3, .wav, .ogg, .m4a.");
    }

    [Fact]
    public async Task PreUploadMusicAsync_WhenCloudinaryUploadFails_ThrowsInvalidOperationException()
    {
        // Arrange
        var file = CreateMockAudioFile("music.m4a", 1024);
        var uploadResult = new VideoUploadResult
        {
            Error = new Error { Message = "Cloud storage unavailable" }
        };

        CloudinaryMock
            .Setup(c => c.UploadVideoAsync(file, It.IsAny<string>()))
            .ReturnsAsync(uploadResult);

        // Act
        var act = () => Service.PreUploadMusicAsync(file, "Title", 1);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Không thể tải tập tin nhạc lên Cloudinary.");
    }

    [Fact]
    public async Task PreUploadMusicAsync_WhenTitleIsWhitespace_UsesFileNameWithoutExtension()
    {
        // Arrange
        var file = CreateMockAudioFile("relaxing_rain.wav", 1024);
        var uploadResult = new VideoUploadResult
        {
            SecureUrl = new Uri("https://cloudinary.com/audio/relaxing_rain.wav"),
            PublicId = "rain_123"
        };

        CloudinaryMock
            .Setup(c => c.UploadVideoAsync(file, It.IsAny<string>()))
            .ReturnsAsync(uploadResult);

        // Act
        var result = await Service.PreUploadMusicAsync(file, "   ", 1);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("relaxing_rain");
    }

    [Fact]
    public async Task PreUploadMusicAsync_WhenFileLengthExactly5MB_UploadsSuccessfully()
    {
        // Arrange
        var fiveMb = 5 * 1024 * 1024;
        var file = CreateMockAudioFile("max_size.mp3", fiveMb);
        var uploadResult = new VideoUploadResult
        {
            SecureUrl = new Uri("https://cloudinary.com/audio/max_size.mp3"),
            PublicId = "max_123"
        };

        CloudinaryMock
            .Setup(c => c.UploadVideoAsync(file, It.IsAny<string>()))
            .ReturnsAsync(uploadResult);

        // Act
        var result = await Service.PreUploadMusicAsync(file, "Max Size Track", 1);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Max Size Track");
    }
}
