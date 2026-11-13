using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Services;

public class SpeakingScriptService : ISpeakingScriptService
{
    private readonly ISpeakingScriptRepository _scriptRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly SpeakingScriptParserService _parserService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly SmartMcDbContext _context;
    private readonly ILogger<SpeakingScriptService> _logger;

    public SpeakingScriptService(
        ISpeakingScriptRepository scriptRepository,
        IGenericRepository<Lesson> lessonRepository,
        SpeakingScriptParserService parserService,
        IUnitOfWork unitOfWork,
        SmartMcDbContext context,
        ILogger<SpeakingScriptService> logger)
    {
        _scriptRepository = scriptRepository;
        _lessonRepository = lessonRepository;
        _parserService = parserService;
        _unitOfWork = unitOfWork;
        _context = context;
        _logger = logger;
    }

    private async Task<Lesson> VerifyLessonOwnershipAsync(int lessonId, int instructorId)
    {
        var lesson = await _context.Lessons
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        if (lesson == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy bài học với ID {lessonId}.");
        }

        if (lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý kịch bản cho khóa học này.");
        }

        return lesson;
    }

    private async Task VerifyCourseOwnershipAsync(int courseId, int instructorId)
    {
        var course = await _context.Courses.FirstOrDefaultAsync(c => c.CourseId == courseId);
        if (course == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy khóa học với ID {courseId}.");
        }

        if (course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý kịch bản cho khóa học này.");
        }
    }

    public async Task<ParsePreviewDto> ParseFileDirectAsync(IFormFile file)
    {
        var parseResult = await _parserService.ParseFileAsync(file);

        return new ParsePreviewDto
        {
            Success = parseResult.Success,
            Errors = parseResult.Errors,
            OriginalContent = parseResult.OriginalContent,
            Levels = parseResult.Levels.Values.Select(l => new LevelPreviewDto
            {
                Level = l.Level,
                Content = l.Content,
                CleanScriptForScoring = l.CleanScriptForScoring
            }).OrderBy(l => l.Level).ToList()
        };
    }

    public async Task<ParsePreviewDto> ParseScriptFileAsync(int lessonId, IFormFile file, int instructorId)
    {
        await VerifyLessonOwnershipAsync(lessonId, instructorId);
        return await ParseFileDirectAsync(file);
    }

    public async Task<SpeakingScriptDto> SaveAndPublishAsync(int lessonId, SaveScriptRequest request, int instructorId)
    {
        var lesson = await VerifyLessonOwnershipAsync(lessonId, instructorId);

        var existingScript = await _scriptRepository.GetByLessonIdAsync(lessonId);

        if (existingScript == null)
        {
            existingScript = new SpeakingScript
            {
                CourseId = lesson.CourseId,
                ModuleId = lesson.ModuleId,
                LessonId = lessonId,
                Scope = request.Scope,
                Title = request.Title.Trim(),
                OriginalContent = request.OriginalContent,
                PassingScore = request.PassingScore,
                CreatedBy = instructorId,
                Status = SpeakingScriptStatus.PUBLISHED,
                UpdatedAt = DateTime.UtcNow
            };

            var validFallback = request.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
                ?? request.OriginalContent
                ?? string.Empty;

            foreach (var lvlDto in request.Levels)
            {
                var contentToSave = !string.IsNullOrWhiteSpace(lvlDto.Content)
                    ? lvlDto.Content.Trim()
                    : validFallback.Trim();

                var cleanScoring = !string.IsNullOrWhiteSpace(lvlDto.CleanScriptForScoring)
                    ? lvlDto.CleanScriptForScoring
                    : _parserService.ExtractCleanScript(contentToSave);

                existingScript.Levels.Add(new SpeakingScriptLevel
                {
                    Level = lvlDto.Level,
                    Content = contentToSave,
                    CleanScriptForScoring = cleanScoring,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _scriptRepository.AddAsync(existingScript);
        }
        else
        {
            existingScript.CourseId = lesson.CourseId;
            existingScript.ModuleId = lesson.ModuleId;
            existingScript.Scope = request.Scope;
            existingScript.Title = request.Title.Trim();
            if (!string.IsNullOrWhiteSpace(request.OriginalContent))
            {
                existingScript.OriginalContent = request.OriginalContent;
            }
            if (request.PassingScore > 0)
            {
                existingScript.PassingScore = request.PassingScore;
            }
            existingScript.Status = SpeakingScriptStatus.PUBLISHED;
            existingScript.UpdatedAt = DateTime.UtcNow;

            var validFallback = request.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
                ?? existingScript.OriginalContent
                ?? existingScript.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
                ?? string.Empty;

            foreach (var lvlDto in request.Levels)
            {
                var contentToSave = !string.IsNullOrWhiteSpace(lvlDto.Content)
                    ? lvlDto.Content.Trim()
                    : validFallback.Trim();

                var cleanScoring = !string.IsNullOrWhiteSpace(lvlDto.CleanScriptForScoring)
                    ? lvlDto.CleanScriptForScoring
                    : _parserService.ExtractCleanScript(contentToSave);

                var existingLevel = existingScript.Levels.FirstOrDefault(l => l.Level == lvlDto.Level);
                if (existingLevel != null)
                {
                    existingLevel.Content = contentToSave;
                    existingLevel.CleanScriptForScoring = cleanScoring;
                    existingLevel.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    existingScript.Levels.Add(new SpeakingScriptLevel
                    {
                        ScriptId = existingScript.ScriptId,
                        Level = lvlDto.Level,
                        Content = contentToSave,
                        CleanScriptForScoring = cleanScoring,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }

            _scriptRepository.Update(existingScript);
        }

        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByLessonIdAsync(lessonId);
        return MapToDto(refreshed!);
    }

    public async Task<SpeakingScriptDto?> GetScriptByLessonAsync(int lessonId)
    {
        var script = await _scriptRepository.GetByLessonIdAsync(lessonId);
        return script == null ? null : MapToDto(script);
    }

    public async Task<SpeakingScriptLevelDto?> GetLevelContentAsync(int lessonId, SpeakingLevel level)
    {
        var scriptLevel = await _scriptRepository.GetLevelByLessonIdAsync(lessonId, level);
        if (scriptLevel == null) return null;

        return new SpeakingScriptLevelDto
        {
            LevelId = scriptLevel.LevelId,
            ScriptId = scriptLevel.ScriptId,
            Level = scriptLevel.Level.ToString(),
            Content = scriptLevel.Content,
            CleanScriptForScoring = scriptLevel.CleanScriptForScoring,
            UpdatedAt = scriptLevel.UpdatedAt
        };
    }

    public async Task<SpeakingScriptDto?> UpdateLevelContentAsync(int scriptId, SpeakingLevel level, UpdateLevelContentRequest request, int instructorId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        if (script == null) return null;

        var courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
        await VerifyCourseOwnershipAsync(courseId, instructorId);

        var scriptLevel = script.Levels.FirstOrDefault(l => l.Level == level);
        var cleanScoring = !string.IsNullOrWhiteSpace(request.CleanScriptForScoring)
            ? request.CleanScriptForScoring
            : _parserService.ExtractCleanScript(request.Content);

        if (scriptLevel != null)
        {
            scriptLevel.Content = request.Content.Trim();
            scriptLevel.CleanScriptForScoring = cleanScoring;
            scriptLevel.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            script.Levels.Add(new SpeakingScriptLevel
            {
                ScriptId = scriptId,
                Level = level,
                Content = request.Content.Trim(),
                CleanScriptForScoring = cleanScoring,
                UpdatedAt = DateTime.UtcNow
            });
        }

        script.UpdatedAt = DateTime.UtcNow;
        _scriptRepository.Update(script);
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        return MapToDto(refreshed!);
    }

    public async Task<bool> DeleteScriptAsync(int lessonId, int instructorId)
    {
        await VerifyLessonOwnershipAsync(lessonId, instructorId);

        var script = await _scriptRepository.GetByLessonIdAsync(lessonId);
        if (script == null) return false;

        _scriptRepository.Remove(script);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // New 3-scope CRUD
    public async Task<IEnumerable<SpeakingScriptDto>> GetAllScriptsAsync(
        int? courseId,
        SpeakingScope? scope,
        int? moduleId,
        int? lessonId,
        string? search)
    {
        var scripts = await _scriptRepository.GetAllWithDetailsAsync(courseId, scope, moduleId, lessonId, search);
        return scripts.Select(MapToDto);
    }

    public async Task<SpeakingScriptDto?> GetScriptByIdAsync(int scriptId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        return script == null ? null : MapToDto(script);
    }

    public async Task<IEnumerable<SpeakingScriptDto>> GetScriptsByCourseAsync(int courseId)
    {
        var scripts = await _scriptRepository.GetByCourseIdAsync(courseId);
        return scripts.Select(MapToDto);
    }

    public async Task<SpeakingScriptDto> CreateScriptAsync(CreateSpeakingScriptRequest request, int instructorId)
    {
        await VerifyCourseOwnershipAsync(request.CourseId, instructorId);

        var script = new SpeakingScript
        {
            CourseId = request.CourseId,
            Scope = request.Scope,
            ModuleId = request.Scope == SpeakingScope.CHAPTER ? request.ModuleId : (request.Scope == SpeakingScope.LESSON ? request.ModuleId : null),
            LessonId = request.Scope == SpeakingScope.LESSON ? request.LessonId : null,
            Title = request.Title.Trim(),
            OriginalContent = request.OriginalContent,
            PassingScore = request.PassingScore > 0 ? request.PassingScore : 80.00m,
            CreatedBy = instructorId,
            Status = SpeakingScriptStatus.PUBLISHED,
            UpdatedAt = DateTime.UtcNow
        };

        var validFallback = request.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
            ?? request.OriginalContent
            ?? string.Empty;

        foreach (var lvlDto in request.Levels)
        {
            var contentToSave = !string.IsNullOrWhiteSpace(lvlDto.Content)
                ? lvlDto.Content.Trim()
                : validFallback.Trim();

            var cleanScoring = !string.IsNullOrWhiteSpace(lvlDto.CleanScriptForScoring)
                ? lvlDto.CleanScriptForScoring
                : _parserService.ExtractCleanScript(contentToSave);

            script.Levels.Add(new SpeakingScriptLevel
            {
                Level = lvlDto.Level,
                Content = contentToSave,
                CleanScriptForScoring = cleanScoring,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _scriptRepository.AddAsync(script);
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByIdWithDetailsAsync(script.ScriptId);
        return MapToDto(refreshed!);
    }

    public async Task<SpeakingScriptDto> UpdateScriptAsync(int scriptId, UpdateSpeakingScriptRequest request, int instructorId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        if (script == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy kịch bản với ID {scriptId}.");
        }

        var courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
        await VerifyCourseOwnershipAsync(courseId, instructorId);

        if (request.CourseId.HasValue && request.CourseId.Value > 0)
        {
            await VerifyCourseOwnershipAsync(request.CourseId.Value, instructorId);
            script.CourseId = request.CourseId.Value;
        }

        if (request.Scope.HasValue)
        {
            script.Scope = request.Scope.Value;
            if (script.Scope == SpeakingScope.FINAL)
            {
                script.ModuleId = null;
                script.LessonId = null;
            }
            else if (script.Scope == SpeakingScope.CHAPTER)
            {
                script.ModuleId = request.ModuleId ?? script.ModuleId;
                script.LessonId = null;
            }
            else if (script.Scope == SpeakingScope.LESSON)
            {
                script.ModuleId = request.ModuleId ?? script.ModuleId;
                script.LessonId = request.LessonId ?? script.LessonId;
            }
        }
        else
        {
            if (request.ModuleId.HasValue) script.ModuleId = request.ModuleId.Value;
            if (request.LessonId.HasValue) script.LessonId = request.LessonId.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            script.Title = request.Title.Trim();
        }

        if (request.OriginalContent != null)
        {
            script.OriginalContent = request.OriginalContent;
        }

        if (request.PassingScore.HasValue && request.PassingScore.Value > 0)
        {
            script.PassingScore = request.PassingScore.Value;
        }

        script.UpdatedAt = DateTime.UtcNow;

        if (request.Levels != null && request.Levels.Count > 0)
        {
            var validFallback = request.Levels.FirstOrDefault(l => !string.IsNullOrWhiteSpace(l.Content))?.Content
                ?? script.OriginalContent
                ?? string.Empty;

            foreach (var lvlDto in request.Levels)
            {
                var contentToSave = !string.IsNullOrWhiteSpace(lvlDto.Content)
                    ? lvlDto.Content.Trim()
                    : validFallback.Trim();

                var cleanScoring = !string.IsNullOrWhiteSpace(lvlDto.CleanScriptForScoring)
                    ? lvlDto.CleanScriptForScoring
                    : _parserService.ExtractCleanScript(contentToSave);

                var existingLevel = script.Levels.FirstOrDefault(l => l.Level == lvlDto.Level);
                if (existingLevel != null)
                {
                    existingLevel.Content = contentToSave;
                    existingLevel.CleanScriptForScoring = cleanScoring;
                    existingLevel.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    script.Levels.Add(new SpeakingScriptLevel
                    {
                        ScriptId = script.ScriptId,
                        Level = lvlDto.Level,
                        Content = contentToSave,
                        CleanScriptForScoring = cleanScoring,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        _scriptRepository.Update(script);
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        return MapToDto(refreshed!);
    }

    public async Task<bool> DeleteScriptByIdAsync(int scriptId, int instructorId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        if (script == null) return false;

        var courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
        await VerifyCourseOwnershipAsync(courseId, instructorId);

        _scriptRepository.Remove(script);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    private static SpeakingScriptDto MapToDto(SpeakingScript script)
    {
        var course = script.Course ?? script.Lesson?.Course;
        var module = script.Module ?? script.Lesson?.Module;

        return new SpeakingScriptDto
        {
            ScriptId = script.ScriptId,
            CourseId = script.CourseId != 0 ? script.CourseId : (course?.CourseId ?? 0),
            CourseTitle = course?.Title ?? string.Empty,
            Scope = script.Scope.ToString(),
            ModuleId = script.ModuleId ?? module?.ModuleId,
            ModuleTitle = module?.Title,
            LessonId = script.LessonId,
            LessonTitle = script.Lesson?.Title,
            Title = script.Title,
            OriginalContent = script.OriginalContent,
            PassingScore = script.PassingScore,
            CreatedBy = script.CreatedBy,
            CreatedByName = script.CreatedByUser?.FullName,
            Status = script.Status.ToString(),
            UpdatedAt = script.UpdatedAt,
            Levels = script.Levels.Select(l => new SpeakingScriptLevelDto
            {
                LevelId = l.LevelId,
                ScriptId = l.ScriptId,
                Level = l.Level.ToString(),
                Content = l.Content,
                CleanScriptForScoring = l.CleanScriptForScoring,
                UpdatedAt = l.UpdatedAt
            }).OrderBy(l => l.Level).ToList()
        };
    }
}
