using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Repositories;

public class SpeakingScriptRepository : GenericRepository<SpeakingScript>, ISpeakingScriptRepository
{
    private readonly SmartMcDbContext _context;

    public SpeakingScriptRepository(SmartMcDbContext context) : base(context)
    {
        _context = context;
    }

    public async Task<SpeakingScript?> GetByLessonIdAsync(int lessonId)
    {
        return await _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .FirstOrDefaultAsync(s => s.LessonId == lessonId);
    }

    public async Task<SpeakingScript?> GetByIdWithDetailsAsync(int scriptId)
    {
        return await _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .FirstOrDefaultAsync(s => s.ScriptId == scriptId);
    }

    public async Task<IEnumerable<SpeakingScript>> GetByCourseIdAsync(int courseId)
    {
        return await _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .Where(s => s.CourseId == courseId || (s.Lesson != null && s.Lesson.CourseId == courseId))
            .OrderBy(s => s.Scope)
            .ThenBy(s => s.ScriptId)
            .ToListAsync();
    }

    public async Task<IEnumerable<SpeakingScript>> GetAllWithDetailsAsync(
        int? courseId,
        SpeakingScope? scope,
        int? moduleId,
        int? lessonId,
        string? search)
    {
        var query = _context.SpeakingScripts
            .Include(s => s.Course)
            .Include(s => s.Module)
            .Include(s => s.Lesson)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .AsQueryable();

        if (courseId.HasValue)
        {
            query = query.Where(s => s.CourseId == courseId.Value || (s.Lesson != null && s.Lesson.CourseId == courseId.Value));
        }

        if (scope.HasValue)
        {
            query = query.Where(s => s.Scope == scope.Value);
        }

        if (moduleId.HasValue)
        {
            query = query.Where(s => s.ModuleId == moduleId.Value || (s.Lesson != null && s.Lesson.ModuleId == moduleId.Value));
        }

        if (lessonId.HasValue)
        {
            query = query.Where(s => s.LessonId == lessonId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(s =>
                s.Title.ToLower().Contains(searchLower) ||
                (s.Course != null && s.Course.Title.ToLower().Contains(searchLower)) ||
                (s.OriginalContent != null && s.OriginalContent.ToLower().Contains(searchLower)));
        }

        return await query
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();
    }

    public async Task<SpeakingScriptLevel?> GetLevelAsync(int scriptId, SpeakingLevel level)
    {
        return await _context.SpeakingScriptLevels
            .Include(l => l.Script)
            .FirstOrDefaultAsync(l => l.ScriptId == scriptId && l.Level == level);
    }

    public async Task<SpeakingScriptLevel?> GetLevelByLessonIdAsync(int lessonId, SpeakingLevel level)
    {
        return await _context.SpeakingScriptLevels
            .Include(l => l.Script)
            .FirstOrDefaultAsync(l => l.Script.LessonId == lessonId && l.Level == level);
    }
}
