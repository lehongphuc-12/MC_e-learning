using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;

namespace MC_BE.Shared.Services.Interfaces;

public interface ICourseCatalogService
{
    Task<IEnumerable<CoursePaymentDto>> GetPublishedCoursesAsync();
    Task<CoursePaymentDto?> GetCourseByIdAsync(int courseId);
}