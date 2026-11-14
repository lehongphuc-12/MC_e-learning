using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

public interface ICourseSyllabusService
{
    Task<SyllabusUploadSessionDto> CreateUploadSessionAsync(int courseId, int instructorId, CreateSyllabusUploadSessionRequest request);
    Task<CourseSyllabusVersionDto> CompleteUploadSessionAsync(int courseId, Guid sessionId, int instructorId);
    Task<CourseSyllabusVersionDto?> GetCurrentVersionAsync(int courseId, int instructorId, bool isAdmin);
    Task<CourseSyllabusVersionDto?> GetSubmittedVersionAsync(int courseId);
    Task<CourseSyllabusPublicOutlineDto?> GetPublicOutlineAsync(int courseId);
    Task<(Stream Stream, string ContentType, string FileName)?> GetVersionContentAsync(int courseId, int versionId, int userId, bool isAdmin, bool isInstructor);
    Task<bool> DeleteDraftVersionAsync(int courseId, int versionId, int instructorId);
}
