using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Repositories.Interfaces;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Courses.Services.Results;
using MC_BE.Shared.Services.Interfaces;

namespace MC_BE.Features.Courses.Services;

public sealed class CourseMaterialsReadService : ICourseMaterialsReadService
{
    private const double PresignedUrlLifetimeHours = 6;

    private readonly ICourseMaterialsReadRepository _repository;
    private readonly IR2StorageService _r2;
    private readonly ICourseLearningAccessService _courseAccess;

    public CourseMaterialsReadService(ICourseMaterialsReadRepository repository, IR2StorageService r2, ICourseLearningAccessService courseAccess)
    {
        _repository = repository;
        _r2 = r2;
        _courseAccess = courseAccess;
    }

    public async Task<CourseMaterialsReadResult> GetMaterialsAsync(
        int courseId,
        int userId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var instructorId = await _repository.GetCourseInstructorIdAsync(courseId, cancellationToken);
        if (!instructorId.HasValue)
            return new CourseMaterialsReadResult(CourseMaterialsReadStatus.CourseNotFound, new List<CourseMaterialReadDto>());

        if (!await _courseAccess.CanAccessCourseAsync(courseId, userId, isAdmin))
        {
            return new CourseMaterialsReadResult(CourseMaterialsReadStatus.Forbidden, new List<CourseMaterialReadDto>());
        }

        var materials = await _repository.GetCourseMaterialsAsync(courseId, cancellationToken);
        var result = materials.Select(MapToDto).ToList();
        return new CourseMaterialsReadResult(CourseMaterialsReadStatus.Success, result);
    }

    private CourseMaterialReadDto MapToDto(CourseMaterial material)
    {
        var objectKey = material.ObjectKey ?? _r2.ExtractKeyFromUrl(material.FileUrl);
        var isVideo = material.MaterialType == MaterialType.VIDEO;

        // Paid-course videos must be served with short-lived URLs; legacy external video URLs stay hidden.
        var fileUrl = isVideo
            ? (string.IsNullOrWhiteSpace(objectKey) ? null : _r2.GetPresignedUrl(objectKey, PresignedUrlLifetimeHours))
            : material.FileUrl;

        return new CourseMaterialReadDto
        {
            MaterialId = material.MaterialId,
            LessonId = material.LessonId,
            Title = material.Title,
            FileUrl = fileUrl,
            MaterialType = material.MaterialType?.ToString(),
        };
    }
}
