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
        // 1. Verify access
        await VerifyLessonOwnershipAsync(lessonId, instructorId);

        // 2. Parse file
        var parseResult = await _parserService.ParseFileAsync(file);

        var preview = new ParsePreviewDto
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

        return preview;
    }

    public async Task<SpeakingScriptDto> SaveAndPublishAsync(int lessonId, SaveScriptRequest request, int instructorId)
    {
        var lesson = await VerifyLessonOwnershipAsync(lessonId, instructorId);

        var existingScript = await _scriptRepository.GetByLessonIdAsync(lessonId);

        if (existingScript == null)
        {
            existingScript = new SpeakingScript
            {
                LessonId = lessonId,
                Title = request.Title.Trim(),
                OriginalContent = request.OriginalContent,
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
            existingScript.Title = request.Title.Trim();
            if (!string.IsNullOrWhiteSpace(request.OriginalContent))
            {
                existingScript.OriginalContent = request.OriginalContent;
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
        if (script == null)
        {
            return null;
        }

        if (script.Lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa kịch bản này.");
        }

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

    private static SpeakingScriptDto MapToDto(SpeakingScript script)
    {
        return new SpeakingScriptDto
        {
            ScriptId = script.ScriptId,
            LessonId = script.LessonId,
            LessonTitle = script.Lesson?.Title ?? string.Empty,
            CourseId = script.Lesson?.CourseId ?? 0,
            CourseTitle = script.Lesson?.Course?.Title ?? string.Empty,
            Title = script.Title,
            OriginalContent = script.OriginalContent,
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
