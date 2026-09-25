using MC_BE.Features.Learning.DTOs;

namespace MC_BE.Features.Learning.Services.Interfaces;

public interface ILearningProgressService
{
    Task<CourseLearningProgressDto?> GetCourseProgressAsync(int learnerId, int courseId);
    Task<CourseLearningProgressDto?> UpdateLessonProgressAsync(int learnerId, int lessonId, UpdateLessonProgressRequest request);
}
