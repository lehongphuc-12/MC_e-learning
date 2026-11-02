using MC_BE.Core.Entities;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

public sealed class CourseLearningAccessService : ICourseLearningAccessService
{
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;

    public CourseLearningAccessService(
        IGenericRepository<Course> courseRepository,
        IGenericRepository<Enrollment> enrollmentRepository)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
    }

    public async Task<bool> CanAccessCourseAsync(int courseId, int userId, bool isAdmin)
    {
        var course = await _courseRepository.GetQueryable()
            .AsNoTracking()
            .Where(c => c.CourseId == courseId)
            .Select(c => new { c.CourseId, c.InstructorId })
            .FirstOrDefaultAsync();

        if (course is null) return false;
        if (isAdmin || course.InstructorId == userId) return true;

        var now = DateTime.UtcNow;
        return await _enrollmentRepository.GetQueryable().AnyAsync(e =>
            e.CourseId == courseId &&
            e.LearnerId == userId &&
            (e.Status == "ACTIVE" || e.Status == "COMPLETED") &&
            (!e.ExpiresAt.HasValue || e.ExpiresAt.Value > now));
    }
}
