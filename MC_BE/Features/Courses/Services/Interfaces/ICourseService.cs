using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

/// <summary>
/// Defines the contract for all Course CRUD operations.
/// The interface lives here; the implementation is in CourseService.cs.
/// WHY an interface? Enables dependency injection and makes the service
/// mockable for unit testing without hitting the database.
/// </summary>
public interface ICourseService
{
    /// <summary>
    /// Fetches the calling instructor's own courses (paginated + filtered).
    /// InstructorID is taken from the JWT token — not from the client.
    /// </summary>
    Task<CourseListResponse> GetInstructorCoursesAsync(
        int instructorId,
        int page,
        int limit,
        string? status,
        int? categoryId,
        string? search);

    /// <summary>
    /// Fetches ALL courses (Admin only, paginated + filtered).
    /// </summary>
    Task<CourseListResponse> GetAllCoursesAsync(
        int page,
        int limit,
        string? status,
        int? categoryId,
        string? search);

    /// <summary>
    /// Fetches a single course by its primary key.
    /// Returns null if not found.
    /// </summary>
    Task<CourseDto?> GetCourseByIdAsync(int courseId);

    /// <summary>
    /// Creates a new course. Slug is auto-generated from the title.
    /// Returns the created CourseDto or null on failure.
    /// </summary>
    Task<CourseDto?> CreateCourseAsync(int instructorId, CreateCourseRequest request);

    /// <summary>
    /// Updates an existing course. Only modifies fields that are not null in the request.
    /// Returns null if course not found or caller is not the owner.
    /// </summary>
    Task<CourseDto?> UpdateCourseAsync(int courseId, int instructorId, UpdateCourseRequest request);

    /// <summary>
    /// Hard-deletes a course. Only the owner instructor can delete their course.
    /// Returns false if not found or caller is not the owner.
    /// </summary>
    Task<bool> DeleteCourseAsync(int courseId, int instructorId);

    /// <summary>
    /// Quick status change (DRAFT ↔ PUBLISHED ↔ ARCHIVED) without opening the full edit form.
    /// </summary>
    Task<CourseDto?> UpdateCourseStatusAsync(int courseId, int instructorId, string newStatus);

    /// <summary>
    /// Bulk creates multiple courses in one operation.
    /// </summary>
    Task<List<CourseDto>> CreateCoursesBulkAsync(int instructorId, List<CreateCourseRequest> requests);
}
