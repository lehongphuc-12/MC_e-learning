namespace MC_BE.Features.Courses.Services.Interfaces;

/// <summary>
/// Central course entitlement policy used by lesson, module, material and playback endpoints.
/// </summary>
public interface ICourseLearningAccessService
{
    Task<bool> CanAccessCourseAsync(int courseId, int userId, bool isAdmin);
}
