using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.BackgroundMusicServiceTests;

public class GetMusicsForLessonAsyncTests : BackgroundMusicServiceTestBase
{
    [Fact]
    public async Task GetMusicsForLessonAsync_WhenDefaultAndLessonMusicsExist_ReturnsOrderedDefaultsFirstThenLessonMusics()
    {
        // Arrange
        ClearBackgroundMusics();
        var targetLessonId = 10;
        var otherLessonId = 99;

        // System defaults
        CreateBackgroundMusic(5, "Default B", "https://audio.com/b.mp3", isSystemDefault: true);
        CreateBackgroundMusic(2, "Default A", "https://audio.com/a.mp3", isSystemDefault: true);

        // Custom for target lesson
        CreateBackgroundMusic(8, "Lesson Custom 2", "https://audio.com/c2.mp3", isSystemDefault: false, lessonId: targetLessonId);
        CreateBackgroundMusic(1, "Lesson Custom 1", "https://audio.com/c1.mp3", isSystemDefault: false, lessonId: targetLessonId);

        // Custom for other lesson (should be ignored)
        CreateBackgroundMusic(20, "Other Lesson Custom", "https://audio.com/other.mp3", isSystemDefault: false, lessonId: otherLessonId);

        // Act
        var result = await Service.GetMusicsForLessonAsync(targetLessonId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(4);

        // Defaults should come first ordered by MusicId
        result[0].MusicId.Should().Be(2);
        result[0].IsSystemDefault.Should().BeTrue();
        result[1].MusicId.Should().Be(5);
        result[1].IsSystemDefault.Should().BeTrue();

        // Custom musics for target lesson come next ordered by MusicId
        result[2].MusicId.Should().Be(1);
        result[2].LessonId.Should().Be(targetLessonId);
        result[2].IsSystemDefault.Should().BeFalse();
        result[3].MusicId.Should().Be(8);
        result[3].LessonId.Should().Be(targetLessonId);
        result[3].IsSystemDefault.Should().BeFalse();
    }

    [Fact]
    public async Task GetMusicsForLessonAsync_WhenLessonHasNoCustomMusicAndNoDefaultsExist_ReturnsEmptyList()
    {
        // Arrange
        ClearBackgroundMusics();
        CreateBackgroundMusic(50, "Other Custom", "https://audio.com/other.mp3", isSystemDefault: false, lessonId: 99);

        // Act
        var result = await Service.GetMusicsForLessonAsync(10);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMusicsForLessonAsync_WhenLessonHasNoCustomMusic_ReturnsOnlyDefaultMusics()
    {
        // Arrange
        ClearBackgroundMusics();
        CreateBackgroundMusic(1, "Default 1", "https://audio.com/def1.mp3", isSystemDefault: true);
        CreateBackgroundMusic(2, "Default 2", "https://audio.com/def2.mp3", isSystemDefault: true);

        // Act
        var result = await Service.GetMusicsForLessonAsync(10);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result.Should().OnlyContain(m => m.IsSystemDefault);
    }
}
