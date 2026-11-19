using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Features.Learning.DTOs;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MC_BE.Tests.Features.Learning.BackgroundMusicServiceTests;

public class LinkMusicsToLessonAsyncTests : BackgroundMusicServiceTestBase
{
    [Fact]
    public async Task LinkMusicsToLessonAsync_WhenValidMusicsAndAuthorized_LinksSuccessfully()
    {
        // Arrange
        var instructorId = 1;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(10, course.CourseId);

        var musics = new List<LinkBackgroundMusicItem>
        {
            new() { Title = "Track 1", AudioUrl = "https://audio.com/1.mp3", CloudinaryPublicId = "id_1" },
            new() { Title = "Track 2", AudioUrl = "https://audio.com/2.mp3", CloudinaryPublicId = "id_2" }
        };

        // Act
        var result = await Service.LinkMusicsToLessonAsync(lesson.LessonId, musics, instructorId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].Title.Should().Be("Track 1");
        result[0].AudioUrl.Should().Be("https://audio.com/1.mp3");
        result[0].LessonId.Should().Be(lesson.LessonId);
        result[0].IsSystemDefault.Should().BeFalse();

        result[1].Title.Should().Be("Track 2");
        result[1].LessonId.Should().Be(lesson.LessonId);

        var dbRecords = await DbContext.BackgroundMusics
            .Where(m => m.LessonId == lesson.LessonId)
            .ToListAsync();
        dbRecords.Should().HaveCount(2);
    }

    [Fact]
    public async Task LinkMusicsToLessonAsync_WhenLessonNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var musics = new List<LinkBackgroundMusicItem>
        {
            new() { Title = "Track 1", AudioUrl = "https://audio.com/1.mp3" }
        };

        // Act
        var act = () => Service.LinkMusicsToLessonAsync(999, musics, 1);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Không tìm thấy bài học tương ứng.");
    }

    [Fact]
    public async Task LinkMusicsToLessonAsync_WhenUserNotCourseInstructor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var course = CreateCourse(1, instructorId: 10);
        var lesson = CreateLesson(5, course.CourseId);
        var musics = new List<LinkBackgroundMusicItem>
        {
            new() { Title = "Track 1", AudioUrl = "https://audio.com/1.mp3" }
        };

        // Act
        var act = () => Service.LinkMusicsToLessonAsync(lesson.LessonId, musics, instructorId: 99);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền quản lý nhạc nền cho bài học này.");
    }

    [Fact]
    public async Task LinkMusicsToLessonAsync_WhenMusicsListIsNull_ReturnsEmptyList()
    {
        // Act
        var result = await Service.LinkMusicsToLessonAsync(10, null!, 1);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task LinkMusicsToLessonAsync_WhenMusicsListIsEmpty_ReturnsEmptyList()
    {
        // Arrange
        var emptyList = new List<LinkBackgroundMusicItem>();

        // Act
        var result = await Service.LinkMusicsToLessonAsync(10, emptyList, 1);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task LinkMusicsToLessonAsync_WhenTitleAndAudioUrlHaveSurroundingSpaces_TrimsProperties()
    {
        // Arrange
        var instructorId = 1;
        var course = CreateCourse(1, instructorId);
        var lesson = CreateLesson(10, course.CourseId);

        var musics = new List<LinkBackgroundMusicItem>
        {
            new()
            {
                Title = "   Spaced Title   ",
                AudioUrl = "   https://audio.com/spaced.mp3   ",
                CloudinaryPublicId = "id_spaced"
            }
        };

        // Act
        var result = await Service.LinkMusicsToLessonAsync(lesson.LessonId, musics, instructorId);

        // Assert
        result.Should().HaveCount(1);
        result[0].Title.Should().Be("Spaced Title");
        result[0].AudioUrl.Should().Be("https://audio.com/spaced.mp3");

        var dbRecord = await DbContext.BackgroundMusics.FirstOrDefaultAsync(m => m.MusicId == result[0].MusicId);
        dbRecord!.Title.Should().Be("Spaced Title");
        dbRecord.AudioUrl.Should().Be("https://audio.com/spaced.mp3");
    }
}
