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
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Course)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .FirstOrDefaultAsync(s => s.LessonId == lessonId);
    }

    public async Task<SpeakingScript?> GetByIdWithDetailsAsync(int scriptId)
    {
        return await _context.SpeakingScripts
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Course)
            .Include(s => s.CreatedByUser)
            .Include(s => s.Levels)
            .FirstOrDefaultAsync(s => s.ScriptId == scriptId);
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
