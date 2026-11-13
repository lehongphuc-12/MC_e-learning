using MC_BE.Features.Courses.Services.Results;

namespace MC_BE.Features.Courses.Services.Interfaces;

public interface ICourseMaterialsReadService
{
    Task<CourseMaterialsReadResult> GetMaterialsAsync(
        int courseId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken = default);
}
