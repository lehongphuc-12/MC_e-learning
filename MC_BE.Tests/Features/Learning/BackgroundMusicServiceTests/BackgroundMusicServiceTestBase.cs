using System;
using CloudinaryDotNet.Actions;
using MC_BE.Core.Entities;
using MC_BE.Features.Learning.Services;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Moq;

namespace MC_BE.Tests.Features.Learning.BackgroundMusicServiceTests;

public abstract class BackgroundMusicServiceTestBase : IDisposable
{
    protected readonly SmartMcDbContext DbContext;
    protected readonly Mock<ICloudinaryService> CloudinaryMock;
    protected readonly Mock<ILogger<BackgroundMusicService>> LoggerMock;
    protected readonly BackgroundMusicService Service;

    protected BackgroundMusicServiceTestBase()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        DbContext = new SmartMcDbContext(options);
        DbContext.Database.EnsureCreated();

        CloudinaryMock = new Mock<ICloudinaryService>();
        LoggerMock = new Mock<ILogger<BackgroundMusicService>>();

        Service = new BackgroundMusicService(
            DbContext,
            CloudinaryMock.Object,
            LoggerMock.Object
        );
    }

    protected void ClearBackgroundMusics()
    {
        DbContext.BackgroundMusics.RemoveRange(DbContext.BackgroundMusics);
        DbContext.SaveChanges();
    }

    protected Course CreateCourse(int courseId, int instructorId, string title = "Sample Course")
    {
        var course = new Course
        {
            CourseId = courseId,
            InstructorId = instructorId,
            Title = title,
            Slug = $"sample-course-{courseId}-{Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow
        };

        DbContext.Courses.Add(course);
        DbContext.SaveChanges();
        return course;
    }

    protected Lesson CreateLesson(int lessonId, int courseId, string title = "Sample Lesson")
    {
        var lesson = new Lesson
        {
            LessonId = lessonId,
            CourseId = courseId,
            Title = title,
            CreatedAt = DateTime.UtcNow
        };

        DbContext.Lessons.Add(lesson);
        DbContext.SaveChanges();
        return lesson;
    }

    protected BackgroundMusic CreateBackgroundMusic(
        int musicId,
        string title,
        string audioUrl,
        bool isSystemDefault = false,
        int? lessonId = null,
        string? cloudinaryPublicId = null)
    {
        var music = new BackgroundMusic
        {
            MusicId = musicId,
            Title = title,
            AudioUrl = audioUrl,
            IsSystemDefault = isSystemDefault,
            LessonId = lessonId,
            CloudinaryPublicId = cloudinaryPublicId,
            CreatedAt = DateTime.UtcNow
        };

        DbContext.BackgroundMusics.Add(music);
        DbContext.SaveChanges();
        return music;
    }

    protected IFormFile CreateMockAudioFile(
        string fileName = "audio.mp3",
        long length = 1024 * 1024)
    {
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns(fileName);
        fileMock.Setup(f => f.Length).Returns(length);
        return fileMock.Object;
    }

    public void Dispose()
    {
        DbContext.Database.EnsureDeleted();
        DbContext.Dispose();
        GC.SuppressFinalize(this);
    }
}
