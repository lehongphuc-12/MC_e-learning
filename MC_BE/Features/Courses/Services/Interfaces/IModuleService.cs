using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

public interface IModuleService
{
    Task<List<ModuleDto>> GetModulesByCourseIdAsync(int courseId);
    Task<ModuleDto?> GetModuleByIdAsync(int moduleId);
    Task<ModuleDto?> CreateModuleAsync(int courseId, int instructorId, CreateModuleRequest request);
    Task<ModuleDto?> UpdateModuleAsync(int moduleId, int instructorId, UpdateModuleRequest request);
    Task<bool> DeleteModuleAsync(int moduleId, int instructorId);
    Task<List<ModuleDto>> CreateModulesBulkAsync(int courseId, int instructorId, List<BulkImportModuleItemRequest> requests);
}
