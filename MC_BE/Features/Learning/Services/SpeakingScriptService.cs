
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Features.Learning.Hubs;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.AspNetCore.SignalR;
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
    private readonly IHubContext<LearningHub> _learningHubContext;

    public SpeakingScriptService(
        ISpeakingScriptRepository scriptRepository,
        IGenericRepository<Lesson> lessonRepository,
        SpeakingScriptParserService parserService,
        IUnitOfWork unitOfWork,
        SmartMcDbContext context,
        ILogger<SpeakingScriptService> logger,
        IHubContext<LearningHub> learningHubContext)
    {
        _scriptRepository = scriptRepository;
        _lessonRepository = lessonRepository;
        _parserService = parserService;
        _unitOfWork = unitOfWork;
        _context = context;
        _logger = logger;
        _learningHubContext = learningHubContext;
    }

    private async Task NotifySpeakingScriptUpdatedAsync(int courseId, int? moduleId, int? lessonId, int scriptId, string action)
    {
        try
        {
            var payload = new
            {
                courseId,
                moduleId,
                lessonId,
                scriptId,
                speakingScriptId = scriptId,
                action
            };

            await _learningHubContext.Clients.All.SendAsync("SpeakingAssignmentUpdated", payload);
            if (courseId > 0)
            {
                await _learningHubContext.Clients.Group($"Course_{courseId}").SendAsync("SpeakingAssignmentUpdated", payload);
            }
            _logger.LogInformation("SignalR: Sent SpeakingAssignmentUpdated CourseId={CourseId}, ScriptId={ScriptId}, Action={Action}", courseId, scriptId, action);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send SpeakingAssignmentUpdated SignalR notification.");
        }
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

        if (request.ScriptType == SpeakingScriptType.OpenPrompt)
        {
            if (string.IsNullOrWhiteSpace(request.PromptContent))
            {
                throw new ArgumentException("Nội dung tình huống / đề bài mở không được để trống khi chọn loại đề mở.");
            }
        }
        else
        {
            if (request.Levels == null || request.Levels.Count < 3)
            {
                throw new ArgumentException("Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED) cho bài nói có kịch bản.");
            }
        }

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
                ScriptType = request.ScriptType,
                PromptContent = request.ScriptType == SpeakingScriptType.OpenPrompt ? request.PromptContent?.Trim() : null,
                StructureHints = request.ScriptType == SpeakingScriptType.OpenPrompt && !string.IsNullOrWhiteSpace(request.StructureHints) ? request.StructureHints.Trim() : null,
                TargetDurationSeconds = request.ScriptType == SpeakingScriptType.OpenPrompt && request.TargetDurationSeconds > 0 ? request.TargetDurationSeconds : null,
                OriginalContent = request.ScriptType == SpeakingScriptType.Scripted ? request.OriginalContent : null,
                PassingScore = request.PassingScore,
                DueAt = request.DueAt,
                IsRemedial = request.IsRemedial ?? false,
                SampleAudioUrl = string.IsNullOrWhiteSpace(request.SampleAudioUrl) ? null : request.SampleAudioUrl.Trim(),
                InstructorNote = string.IsNullOrWhiteSpace(request.InstructorNote) ? null : request.InstructorNote.Trim(),
                CreatedBy = instructorId,
                Status = SpeakingScriptStatus.PUBLISHED,
                UpdatedAt = DateTime.UtcNow
            };

            if (request.ScriptType == SpeakingScriptType.Scripted)
            {
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
            }

            SyncRubricCriteria(existingScript, request.RubricCriteria);

            await _scriptRepository.AddAsync(existingScript);
        }
        else
        {
            existingScript.CourseId = lesson.CourseId;
            existingScript.ModuleId = lesson.ModuleId;
            existingScript.Scope = request.Scope;
            existingScript.Title = request.Title.Trim();
            existingScript.ScriptType = request.ScriptType;

            if (request.PassingScore > 0)
            {
                existingScript.PassingScore = request.PassingScore;
            }
            existingScript.Status = SpeakingScriptStatus.PUBLISHED;
            existingScript.UpdatedAt = DateTime.UtcNow;
            existingScript.DueAt = request.DueAt;
            if (request.IsRemedial.HasValue) existingScript.IsRemedial = request.IsRemedial.Value;
            if (request.SampleAudioUrl != null)
            {
                existingScript.SampleAudioUrl = string.IsNullOrWhiteSpace(request.SampleAudioUrl) ? null : request.SampleAudioUrl.Trim();
            }
            if (request.InstructorNote != null)
            {
                existingScript.InstructorNote = string.IsNullOrWhiteSpace(request.InstructorNote) ? null : request.InstructorNote.Trim();
            }

            if (request.ScriptType == SpeakingScriptType.OpenPrompt)
            {
                existingScript.PromptContent = request.PromptContent?.Trim();
                existingScript.StructureHints = string.IsNullOrWhiteSpace(request.StructureHints) ? null : request.StructureHints.Trim();
                existingScript.TargetDurationSeconds = request.TargetDurationSeconds > 0 ? request.TargetDurationSeconds : null;
                // Clean state: remove existing levels and clear OriginalContent
                if (existingScript.Levels.Count > 0)
                {
                    _context.SpeakingScriptLevels.RemoveRange(existingScript.Levels);
                    existingScript.Levels.Clear();
                }
                existingScript.OriginalContent = null;
            }
            else
            {
                // Scripted: Clean state for open prompt fields
                existingScript.PromptContent = null;
                existingScript.StructureHints = null;
                existingScript.TargetDurationSeconds = null;

                if (!string.IsNullOrWhiteSpace(request.OriginalContent))
                {
                    existingScript.OriginalContent = request.OriginalContent;
                }

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
            }

            if (request.RubricCriteria != null)
            {
                SyncRubricCriteria(existingScript, request.RubricCriteria);
            }

            _scriptRepository.Update(existingScript);
        }

        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByLessonIdAsync(lessonId);
        var resultDto = MapToDto(refreshed!);
        await NotifySpeakingScriptUpdatedAsync(resultDto.CourseId, resultDto.ModuleId, resultDto.LessonId, resultDto.ScriptId, "PUBLISHED");
        return resultDto;
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
        var resultDto = MapToDto(refreshed!);
        await NotifySpeakingScriptUpdatedAsync(resultDto.CourseId, resultDto.ModuleId, resultDto.LessonId, resultDto.ScriptId, "LEVEL_UPDATED");
        return resultDto;
    }

    public async Task<bool> DeleteScriptAsync(int lessonId, int instructorId)
    {
        await VerifyLessonOwnershipAsync(lessonId, instructorId);

        var script = await _scriptRepository.GetByLessonIdAsync(lessonId);
        if (script == null) return false;

        var courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
        var moduleId = script.ModuleId;
        var sId = script.ScriptId;

        _scriptRepository.Remove(script);
        await _unitOfWork.SaveChangesAsync();

        await NotifySpeakingScriptUpdatedAsync(courseId, moduleId, lessonId, sId, "DELETED");
        return true;
    }

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

        if (!request.IsRemedial && request.Scope == SpeakingScope.LESSON && request.LessonId.HasValue &&
            await _context.SpeakingScripts.AnyAsync(x => x.LessonId == request.LessonId && !x.IsRemedial))
            throw new ArgumentException("Bài học này đã có Speaking chính thức. Có thể tạo thêm Speaking bổ trợ riêng.");

        if (request.ScriptType == SpeakingScriptType.OpenPrompt)
        {
            if (string.IsNullOrWhiteSpace(request.PromptContent))
            {
                throw new ArgumentException("Nội dung tình huống / đề bài mở không được để trống khi chọn loại đề mở.");
            }
        }
        else
        {
            if (request.Levels == null || request.Levels.Count < 3)
            {
                throw new ArgumentException("Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED) cho bài nói có kịch bản.");
            }
        }

        var targetModuleId = request.Scope == SpeakingScope.CHAPTER
            ? (request.ModuleId ?? request.ChapterId)
            : (request.Scope == SpeakingScope.LESSON ? (request.ModuleId ?? request.ChapterId) : null);

        var script = new SpeakingScript
        {
            CourseId = request.CourseId,
            Scope = request.Scope,
            ModuleId = targetModuleId,
            LessonId = request.Scope == SpeakingScope.LESSON ? request.LessonId : null,
            BackgroundMusicId = request.BackgroundMusicId > 0 ? request.BackgroundMusicId : null,
            Title = request.Title.Trim(),
            ScriptType = request.ScriptType,
            PromptContent = request.ScriptType == SpeakingScriptType.OpenPrompt ? request.PromptContent?.Trim() : null,
            StructureHints = request.ScriptType == SpeakingScriptType.OpenPrompt && !string.IsNullOrWhiteSpace(request.StructureHints) ? request.StructureHints.Trim() : null,
            TargetDurationSeconds = request.ScriptType == SpeakingScriptType.OpenPrompt && request.TargetDurationSeconds > 0 ? request.TargetDurationSeconds : null,
            OriginalContent = request.ScriptType == SpeakingScriptType.Scripted ? request.OriginalContent : null,
            PassingScore = request.PassingScore > 0 ? request.PassingScore : 80.00m,
            DueAt = request.DueAt,
            IsRemedial = request.IsRemedial,
            SampleAudioUrl = string.IsNullOrWhiteSpace(request.SampleAudioUrl) ? null : request.SampleAudioUrl.Trim(),
            InstructorNote = string.IsNullOrWhiteSpace(request.InstructorNote) ? null : request.InstructorNote.Trim(),
            CreatedBy = instructorId,
            Status = SpeakingScriptStatus.PUBLISHED,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.ScriptType == SpeakingScriptType.Scripted)
        {
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
        }

        SyncRubricCriteria(script, request.RubricCriteria);

        await _scriptRepository.AddAsync(script);
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByIdWithDetailsAsync(script.ScriptId);
        var resultDto = MapToDto(refreshed!);
        await NotifySpeakingScriptUpdatedAsync(resultDto.CourseId, resultDto.ModuleId, resultDto.LessonId, resultDto.ScriptId, "CREATED");
        return resultDto;
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

        var effectiveScope = request.Scope ?? script.Scope;
        var effectiveLessonId = effectiveScope == SpeakingScope.LESSON
            ? request.LessonId ?? script.LessonId
            : null;
        var effectiveIsRemedial = request.IsRemedial ?? script.IsRemedial;
        if (!effectiveIsRemedial && effectiveScope == SpeakingScope.LESSON && effectiveLessonId.HasValue &&
            await _context.SpeakingScripts.AnyAsync(x =>
                x.ScriptId != scriptId && x.LessonId == effectiveLessonId && !x.IsRemedial))
            throw new ArgumentException("Bài học này đã có Speaking chính thức. Có thể tạo thêm Speaking bổ trợ riêng.");

        if (request.CourseId.HasValue && request.CourseId.Value > 0)
        {
            await VerifyCourseOwnershipAsync(request.CourseId.Value, instructorId);
            script.CourseId = request.CourseId.Value;
        }

        var targetModuleId = request.ModuleId ?? request.ChapterId;

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
                script.ModuleId = targetModuleId ?? script.ModuleId;
                script.LessonId = null;
            }
            else if (script.Scope == SpeakingScope.LESSON)
            {
                script.ModuleId = targetModuleId ?? script.ModuleId;
                script.LessonId = request.LessonId ?? script.LessonId;
            }
        }
        else
        {
            if (targetModuleId.HasValue) script.ModuleId = targetModuleId.Value;
            if (request.LessonId.HasValue) script.LessonId = request.LessonId.Value;
        }

        if (request.BackgroundMusicId.HasValue)
        {
            script.BackgroundMusicId = request.BackgroundMusicId.Value <= 0 ? null : request.BackgroundMusicId.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
        {
            script.Title = request.Title.Trim();
        }

        if (request.PassingScore.HasValue && request.PassingScore.Value > 0)
        {
            script.PassingScore = request.PassingScore.Value;
        }

        script.UpdatedAt = DateTime.UtcNow;
        if (request.DueAt.HasValue) script.DueAt = request.DueAt.Value;
        if (request.IsRemedial.HasValue) script.IsRemedial = request.IsRemedial.Value;
        if (request.ClearSampleAudio == true)
        {
            script.SampleAudioUrl = null;
        }
        else if (request.SampleAudioUrl != null)
        {
            script.SampleAudioUrl = string.IsNullOrWhiteSpace(request.SampleAudioUrl) ? null : request.SampleAudioUrl.Trim();
        }
        if (request.InstructorNote != null)
        {
            script.InstructorNote = string.IsNullOrWhiteSpace(request.InstructorNote) ? null : request.InstructorNote.Trim();
        }

        var targetScriptType = request.ScriptType ?? script.ScriptType;
        script.ScriptType = targetScriptType;

        if (targetScriptType == SpeakingScriptType.OpenPrompt)
        {
            var effectivePrompt = request.PromptContent ?? script.PromptContent;
            if (string.IsNullOrWhiteSpace(effectivePrompt))
            {
                throw new ArgumentException("Nội dung tình huống / đề bài mở không được để trống khi chọn loại đề mở.");
            }
            script.PromptContent = effectivePrompt.Trim();

            if (request.StructureHints != null)
            {
                script.StructureHints = string.IsNullOrWhiteSpace(request.StructureHints) ? null : request.StructureHints.Trim();
            }

            if (request.TargetDurationSeconds.HasValue)
            {
                script.TargetDurationSeconds = request.TargetDurationSeconds.Value <= 0 ? null : request.TargetDurationSeconds.Value;
            }

            // Clean state: remove levels and clear OriginalContent
            if (script.Levels.Count > 0)
            {
                _context.SpeakingScriptLevels.RemoveRange(script.Levels);
                script.Levels.Clear();
            }
            script.OriginalContent = null;
        }
        else
        {
            // Scripted: Clean state for open prompt fields
            script.PromptContent = null;
            script.StructureHints = null;
            script.TargetDurationSeconds = null;

            if (request.OriginalContent != null)
            {
                script.OriginalContent = request.OriginalContent;
            }

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
            else if (script.Levels.Count < 3)
            {
                throw new ArgumentException("Phải cung cấp đủ 3 cấp độ (BEGINNER, INTERMEDIATE, ADVANCED) khi chuyển sang bài nói có kịch bản.");
            }
        }

        if (request.RubricCriteria != null)
        {
            SyncRubricCriteria(script, request.RubricCriteria);
        }

        _scriptRepository.Update(script);
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        var resultDto = MapToDto(refreshed!);
        await NotifySpeakingScriptUpdatedAsync(resultDto.CourseId, resultDto.ModuleId, resultDto.LessonId, resultDto.ScriptId, "UPDATED");
        return resultDto;
    }

    public async Task<bool> DeleteScriptByIdAsync(int scriptId, int instructorId)
    {
        var script = await _scriptRepository.GetByIdWithDetailsAsync(scriptId);
        if (script == null) return false;

        var courseId = script.CourseId != 0 ? script.CourseId : (script.Lesson?.CourseId ?? 0);
        await VerifyCourseOwnershipAsync(courseId, instructorId);

        var moduleId = script.ModuleId;
        var lId = script.LessonId;

        _scriptRepository.Remove(script);
        await _unitOfWork.SaveChangesAsync();

        await NotifySpeakingScriptUpdatedAsync(courseId, moduleId, lId, scriptId, "DELETED");
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
            ChapterId = script.ModuleId ?? module?.ModuleId,
            ModuleTitle = module?.Title,
            LessonId = script.LessonId,
            LessonTitle = script.Lesson?.Title,
            BackgroundMusicId = script.BackgroundMusicId,
            BackgroundMusicTitle = script.BackgroundMusic?.Title,
            BackgroundMusicUrl = script.BackgroundMusic?.AudioUrl,
            Title = script.Title,
            OriginalContent = script.OriginalContent,
            PassingScore = script.PassingScore,
            DueAt = script.DueAt,
            IsRemedial = script.IsRemedial,
            CreatedBy = script.CreatedBy,
            CreatedByName = script.CreatedByUser?.FullName,
            Status = script.Status.ToString(),
            ScriptType = script.ScriptType,
            PromptContent = script.PromptContent,
            StructureHints = script.StructureHints,
            TargetDurationSeconds = script.TargetDurationSeconds,
            SampleAudioUrl = script.SampleAudioUrl,
            InstructorNote = script.InstructorNote,
            UpdatedAt = script.UpdatedAt,
            Levels = script.Levels.Select(l => new SpeakingScriptLevelDto
            {
                LevelId = l.LevelId,
                ScriptId = l.ScriptId,
                Level = l.Level.ToString(),
                Content = l.Content,
                CleanScriptForScoring = l.CleanScriptForScoring,
                UpdatedAt = l.UpdatedAt
            }).OrderBy(l => l.Level).ToList(),
            RubricCriteria = (script.RubricCriteria != null && script.RubricCriteria.Count > 0)
                ? script.RubricCriteria.Select(r => new SpeakingRubricCriterionDto
                {
                    CriterionId = r.CriterionId,
                    ScriptId = r.ScriptId,
                    Code = r.Code,
                    Name = r.Name,
                    WeightPercentage = r.WeightPercentage,
                    IsMandatory = r.IsMandatory,
                    OrderIndex = r.OrderIndex,
                    UpdatedAt = r.UpdatedAt
                }).OrderBy(r => r.OrderIndex).ThenBy(r => r.Code).ToList()
                : DefaultRubricCriteria.Select((d, idx) => new SpeakingRubricCriterionDto
                {
                    CriterionId = idx + 1,
                    ScriptId = script.ScriptId,
                    Code = d.Code,
                    Name = d.Name,
                    WeightPercentage = d.WeightPercentage,
                    IsMandatory = d.IsMandatory,
                    OrderIndex = d.OrderIndex,
                    UpdatedAt = script.UpdatedAt
                }).ToList()
        };
    }

    private static readonly List<SaveRubricCriterionDto> DefaultRubricCriteria = new()
    {
        new SaveRubricCriterionDto { Code = "C01", Name = "Phát âm & thanh điệu", WeightPercentage = 18m, IsMandatory = true, OrderIndex = 1 },
        new SaveRubricCriterionDto { Code = "C02", Name = "Độ rõ lời", WeightPercentage = 10m, IsMandatory = true, OrderIndex = 2 },
        new SaveRubricCriterionDto { Code = "C03", Name = "Độ chính xác nội dung", WeightPercentage = 7m, IsMandatory = true, OrderIndex = 3 },
    };

    private void SyncRubricCriteria(SpeakingScript script, List<SaveRubricCriterionDto>? criteriaDtos)
    {
        var criteriaToSave = (criteriaDtos != null && criteriaDtos.Count > 0)
            ? criteriaDtos
            : DefaultRubricCriteria;

        var totalWeight = criteriaToSave.Sum(c => c.WeightPercentage);
        if (totalWeight > 100m)
        {
            throw new InvalidOperationException($"Tổng trọng số các tiêu chí chấm điểm ({totalWeight}%) vượt quá 100%. Hệ thống không cho phép lưu thay đổi hoặc tạo bài nói khi vượt quá 100%.");
        }

        script.RubricCriteria.Clear();

        int order = 1;
        foreach (var c in criteriaToSave)
        {
            if (string.IsNullOrWhiteSpace(c.Name)) continue;

            var code = string.IsNullOrWhiteSpace(c.Code) ? $"C{order:D2}" : c.Code.Trim();
            var isMandatory = c.IsMandatory || code is "C01" or "C02" or "C03";
            var weight = Math.Clamp(c.WeightPercentage, 0m, 100m);

            script.RubricCriteria.Add(new SpeakingRubricCriterion
            {
                ScriptId = script.ScriptId,
                Code = code,
                Name = c.Name.Trim(),
                WeightPercentage = weight,
                IsMandatory = isMandatory,
                OrderIndex = c.OrderIndex > 0 ? c.OrderIndex : order,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            order++;
        }
    }
}
