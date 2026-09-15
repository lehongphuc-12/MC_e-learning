using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

public interface ILessonService
{
    Task<List<LessonDto>> GetLessonsByCourseIdAsync(int courseId);
    Task<LessonDto?> GetLessonByIdAsync(int lessonId);
    Task<LessonDto?> CreateLessonAsync(int courseId, int instructorId, CreateLessonRequest request);
    Task<List<LessonDto>> CreateLessonsBulkAsync(int courseId, int instructorId, List<CreateLessonRequest> requests);
    Task<LessonDto?> UpdateLessonAsync(int lessonId, int instructorId, UpdateLessonRequest request);
    Task<bool> DeleteLessonAsync(int lessonId, int instructorId);
}
