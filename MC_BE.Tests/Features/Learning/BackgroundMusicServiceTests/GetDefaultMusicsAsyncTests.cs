using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.BackgroundMusicServiceTests;

public class GetDefaultMusicsAsyncTests : BackgroundMusicServiceTestBase
{
    [Fact]
    public async Task GetDefaultMusicsAsync_WhenDefaultMusicsExist_ReturnsOnlySystemDefaultMusicsOrderedById()
    {
        // Arrange
        ClearBackgroundMusics();
        CreateBackgroundMusic(10, "Custom Track", "https://audio.com/custom.mp3", isSystemDefault: false, lessonId: 1);
        CreateBackgroundMusic(5, "Default 2", "https://audio.com/def2.mp3", isSystemDefault: true);
        CreateBackgroundMusic(2, "Default 1", "https://audio.com/def1.mp3", isSystemDefault: true);

        // Act
        var result = await Service.GetDefaultMusicsAsync();

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].MusicId.Should().Be(2);
        result[0].Title.Should().Be("Default 1");
        result[0].IsSystemDefault.Should().BeTrue();
        result[1].MusicId.Should().Be(5);
        result[1].Title.Should().Be("Default 2");
        result[1].IsSystemDefault.Should().BeTrue();
    }

    [Fact]
    public async Task GetDefaultMusicsAsync_WhenOnlyCustomMusicsExist_ReturnsEmptyList()
    {
        // Arrange
        ClearBackgroundMusics();
        CreateBackgroundMusic(100, "Custom Track 1", "https://audio.com/custom1.mp3", isSystemDefault: false, lessonId: 1);
        CreateBackgroundMusic(101, "Custom Track 2", "https://audio.com/custom2.mp3", isSystemDefault: false, lessonId: 2);

        // Act
        var result = await Service.GetDefaultMusicsAsync();

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetDefaultMusicsAsync_WhenNoMusicsInDatabase_ReturnsEmptyList()
    {
        // Arrange
        ClearBackgroundMusics();

        // Act
        var result = await Service.GetDefaultMusicsAsync();

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }
}
