using MC_BE.Core.Entities;
using MC_BE.Features.Courses.Repositories.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Repositories;

/// <summary>
/// Encapsulates the EF Core queries used by the course-material read use case.
/// </summary>
public sealed class CourseMaterialsReadRepository : ICourseMaterialsReadRepository
{
    private readonly SmartMcDbContext _db;

    public CourseMaterialsReadRepository(SmartMcDbContext db)
    {
        _db = db;
    }

    public Task<int?> GetCourseInstructorIdAsync(int courseId, CancellationToken cancellationToken)
    {
        return _db.Courses
            .AsNoTracking()
            .Where(course => course.CourseId == courseId)
            .Select(course => (int?)course.InstructorId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> HasActiveEnrollmentAsync(
        int courseId,
        int learnerId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        return _db.Enrollments
            .AsNoTracking()
            .AnyAsync(enrollment =>
                enrollment.CourseId == courseId &&
                enrollment.LearnerId == learnerId &&
                (enrollment.Status == "ACTIVE" || enrollment.Status == "COMPLETED") &&
                (!enrollment.ExpiresAt.HasValue || enrollment.ExpiresAt.Value > utcNow),
                cancellationToken);
    }

    public Task<List<CourseMaterial>> GetCourseMaterialsAsync(int courseId, CancellationToken cancellationToken)
    {
        return _db.CourseMaterials
            .AsNoTracking()
            .Where(material => material.CourseId == courseId ||
                (material.LessonId.HasValue && _db.Lessons.Any(lesson =>
                    lesson.LessonId == material.LessonId.Value && lesson.CourseId == courseId)))
            .OrderBy(material => material.MaterialId)
            .ToListAsync(cancellationToken);
    }
}
