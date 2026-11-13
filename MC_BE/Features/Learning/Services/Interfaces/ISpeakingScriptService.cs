using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.Services.Interfaces;

public interface ISpeakingScriptService
{
    Task<ParsePreviewDto> ParseFileDirectAsync(IFormFile file);
    Task<ParsePreviewDto> ParseScriptFileAsync(int lessonId, IFormFile file, int instructorId);
    Task<SpeakingScriptDto> SaveAndPublishAsync(int lessonId, SaveScriptRequest request, int instructorId);
    Task<SpeakingScriptDto?> GetScriptByLessonAsync(int lessonId);
    Task<SpeakingScriptLevelDto?> GetLevelContentAsync(int lessonId, SpeakingLevel level);
    Task<SpeakingScriptDto?> UpdateLevelContentAsync(int scriptId, SpeakingLevel level, UpdateLevelContentRequest request, int instructorId);
    Task<bool> DeleteScriptAsync(int lessonId, int instructorId);

    // New 3-scope endpoints
    Task<IEnumerable<SpeakingScriptDto>> GetAllScriptsAsync(int? courseId, SpeakingScope? scope, int? moduleId, int? lessonId, string? search);
    Task<SpeakingScriptDto?> GetScriptByIdAsync(int scriptId);
    Task<IEnumerable<SpeakingScriptDto>> GetScriptsByCourseAsync(int courseId);
    Task<SpeakingScriptDto> CreateScriptAsync(CreateSpeakingScriptRequest request, int instructorId);
    Task<SpeakingScriptDto> UpdateScriptAsync(int scriptId, UpdateSpeakingScriptRequest request, int instructorId);
    Task<bool> DeleteScriptByIdAsync(int scriptId, int instructorId);
}
