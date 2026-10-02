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

    /// <summary>
    /// Uploads a video file to Cloudflare R2, stores the resulting URL in the
    /// lesson's CourseMaterial record, and returns the updated LessonDto.
    /// Returns null if the lesson is not found or does not belong to the instructor.
    /// </summary>
    Task<LessonDto?> UploadVideoAsync(int lessonId, int instructorId, IFormFile file);

    /// <summary>
    /// Removes the video from R2 and clears the VideoUrl on the lesson.
    /// Returns false if not found / not owned by instructor.
    /// </summary>
    Task<bool> DeleteVideoAsync(int lessonId, int instructorId);
}
