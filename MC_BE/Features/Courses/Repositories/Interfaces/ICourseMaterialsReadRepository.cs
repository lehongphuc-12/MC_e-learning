using MC_BE.Core.Entities;

namespace MC_BE.Features.Courses.Repositories.Interfaces;

public interface ICourseMaterialsReadRepository
{
    Task<int?> GetCourseInstructorIdAsync(int courseId, CancellationToken cancellationToken);
    Task<bool> HasActiveEnrollmentAsync(int courseId, int learnerId, DateTime utcNow, CancellationToken cancellationToken);
    Task<List<CourseMaterial>> GetCourseMaterialsAsync(int courseId, CancellationToken cancellationToken);
}
