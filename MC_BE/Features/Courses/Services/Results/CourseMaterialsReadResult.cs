using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Results;

public enum CourseMaterialsReadStatus
{
    Success,
    CourseNotFound,
    Forbidden,
}

public sealed record CourseMaterialsReadResult(
    CourseMaterialsReadStatus Status,
    List<CourseMaterialReadDto> Materials);
