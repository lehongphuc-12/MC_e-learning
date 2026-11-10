using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Repositories.Interfaces;

public interface ISpeakingScriptRepository : IGenericRepository<SpeakingScript>
{
    Task<SpeakingScript?> GetByLessonIdAsync(int lessonId);
    Task<SpeakingScript?> GetByIdWithDetailsAsync(int scriptId);
    Task<SpeakingScriptLevel?> GetLevelAsync(int scriptId, SpeakingLevel level);
    Task<SpeakingScriptLevel?> GetLevelByLessonIdAsync(int lessonId, SpeakingLevel level);
}
