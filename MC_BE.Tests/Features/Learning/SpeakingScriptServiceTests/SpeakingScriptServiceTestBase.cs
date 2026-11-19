using System;
using System.IO;
using System.Text;
using System.Threading;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.Repositories;
using MC_BE.Features.Learning.Services;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Moq;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public abstract class SpeakingScriptServiceTestBase : IDisposable
{
    protected readonly SmartMcDbContext DbContext;
    protected readonly SpeakingScriptRepository ScriptRepository;
    protected readonly GenericRepository<Lesson> LessonRepository;
    protected readonly SpeakingScriptParserService ParserService;
    protected readonly UnitOfWork UnitOfWork;
    protected readonly Mock<ILogger<SpeakingScriptService>> LoggerMock = new();
    protected readonly SpeakingScriptService Service;

    protected SpeakingScriptServiceTestBase()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        DbContext = new SmartMcDbContext(options);
        DbContext.Database.EnsureCreated();

        ScriptRepository = new SpeakingScriptRepository(DbContext);
        LessonRepository = new GenericRepository<Lesson>(DbContext);
        ParserService = new SpeakingScriptParserService(Mock.Of<ILogger<SpeakingScriptParserService>>());
        UnitOfWork = new UnitOfWork(DbContext);

        Service = new SpeakingScriptService(
            ScriptRepository,
            LessonRepository,
            ParserService,
            UnitOfWork,
            DbContext,
            LoggerMock.Object
        );
    }

    protected User CreateUser(int userId, string fullName = "Test User", string email = "user@example.com")
    {
        var user = new User
        {
            UserId = userId,
            FullName = fullName,
            Email = email,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Users.Add(user);
        DbContext.SaveChanges();
        return user;
    }

    protected Course CreateCourse(int courseId, int instructorId = 1, string title = "Sample Course")
    {
        var instructor = DbContext.Users.Find(instructorId) ?? CreateUser(instructorId, "Instructor User", $"inst{instructorId}@example.com");
        var course = new Course
        {
            CourseId = courseId,
            InstructorId = instructorId,
            Instructor = instructor,
            Title = title,
            Slug = $"course-{courseId}-{Guid.NewGuid():N}",
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Courses.Add(course);
        DbContext.SaveChanges();
        return course;
    }

    protected Module CreateModule(int moduleId, int courseId, string title = "Module", int orderIndex = 1)
    {
        var module = new Module
        {
            ModuleId = moduleId,
            CourseId = courseId,
            Title = title,
            OrderIndex = orderIndex,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Modules.Add(module);
        DbContext.SaveChanges();
        return module;
    }

    protected Lesson CreateLesson(
        int lessonId,
        int courseId,
        int? moduleId = null,
        string title = "Lesson",
        int orderIndex = 1,
        LessonStatus status = LessonStatus.ACTIVE)
    {
        var lesson = new Lesson
        {
            LessonId = lessonId,
            CourseId = courseId,
            ModuleId = moduleId,
            Title = title,
            OrderIndex = orderIndex,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };
        DbContext.Lessons.Add(lesson);
        DbContext.SaveChanges();
        return lesson;
    }

    protected SpeakingScript CreateSpeakingScript(
        int scriptId,
        int courseId,
        SpeakingScope scope = SpeakingScope.FINAL,
        int? moduleId = null,
        int? lessonId = null,
        string title = "Speaking Script",
        decimal passingScore = 80.00m,
        int? createdBy = 1,
        SpeakingScriptStatus status = SpeakingScriptStatus.PUBLISHED)
    {
        var script = new SpeakingScript
        {
            ScriptId = scriptId,
            CourseId = courseId,
            Scope = scope,
            ModuleId = moduleId,
            LessonId = lessonId,
            Title = title,
            PassingScore = passingScore,
            CreatedBy = createdBy,
            Status = status,
            UpdatedAt = DateTime.UtcNow
        };
        DbContext.SpeakingScripts.Add(script);
        DbContext.SaveChanges();
        return script;
    }

    protected SpeakingScriptLevel CreateSpeakingScriptLevel(
        int levelId,
        int scriptId,
        SpeakingLevel level,
        string content,
        string? cleanScriptForScoring = null)
    {
        var scriptLevel = new SpeakingScriptLevel
        {
            LevelId = levelId,
            ScriptId = scriptId,
            Level = level,
            Content = content,
            CleanScriptForScoring = cleanScriptForScoring ?? content,
            UpdatedAt = DateTime.UtcNow
        };
        DbContext.SpeakingScriptLevels.Add(scriptLevel);
        DbContext.SaveChanges();
        return scriptLevel;
    }

    protected IFormFile CreateMockTxtFile(string fileName, string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        return CreateMockCustomFile(fileName, bytes);
    }

    protected IFormFile CreateMockEmptyFile(string fileName)
    {
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns(fileName);
        fileMock.Setup(f => f.Length).Returns(0);
        return fileMock.Object;
    }

    protected IFormFile CreateMockDocxFile(string fileName, params string[] lines)
    {
        using var ms = new MemoryStream();
        using (var wordDoc = WordprocessingDocument.Create(ms, DocumentFormat.OpenXml.WordprocessingDocumentType.Document, true))
        {
            var mainPart = wordDoc.AddMainDocumentPart();
            mainPart.Document = new Document(new Body());
            var body = mainPart.Document.Body!;
            foreach (var line in lines)
            {
                body.AppendChild(new Paragraph(new Run(new Text(line))));
            }
            mainPart.Document.Save();
        }
        var bytes = ms.ToArray();
        return CreateMockCustomFile(fileName, bytes);
    }

    protected IFormFile CreateMockCustomFile(string fileName, byte[] bytes)
    {
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns(fileName);
        fileMock.Setup(f => f.Length).Returns(bytes.Length);
        fileMock.Setup(f => f.OpenReadStream()).Returns(() => new MemoryStream(bytes));
        fileMock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns((Stream target, CancellationToken ct) => target.WriteAsync(bytes, 0, bytes.Length, ct));
        return fileMock.Object;
    }

    public void Dispose()
    {
        DbContext.Database.EnsureDeleted();
        DbContext.Dispose();
        GC.SuppressFinalize(this);
    }
}
