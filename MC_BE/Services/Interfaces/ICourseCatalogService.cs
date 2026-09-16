using MC_BE.DTOs;

namespace MC_BE.Services.Interfaces;

public interface ICourseCatalogService
{
    Task<IEnumerable<CoursePaymentDto>> GetPublishedCoursesAsync();

    Task<CoursePaymentDto?> GetCourseByIdAsync(int courseId);
}