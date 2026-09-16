using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Shared.Services.Interfaces;

namespace MC_BE.Shared.Services;

public class MockCourseCatalogService : ICourseCatalogService
{
    private static readonly List<CoursePaymentDto> Courses =
    [
        new CoursePaymentDto
        {
            CourseId = 4,
            Title = "Khóa học Test Sandbox 10k",
            Description = "Khóa học phục vụ kiểm thử luồng thanh toán giá nhỏ.",
            ThumbnailUrl = "https://placehold.co/800x450?text=Test+Course+10k",
            Price = 10000,
            Status = "PUBLISHED"
        },
        new CoursePaymentDto
        {
            CourseId = 1,
            Title = "MC Fundamentals",
            Description = "Foundation course for professional MC communication.",
            ThumbnailUrl = "https://placehold.co/800x450?text=MC+Fundamentals",
            Price = 499000,
            Status = "PUBLISHED"
        },
        new CoursePaymentDto
        {
            CourseId = 2,
            Title = "Voice & Stage Presence",
            Description = "Practice voice control, pacing and stage confidence.",
            ThumbnailUrl = "https://placehold.co/800x450?text=Voice+Stage",
            Price = 699000,
            Status = "PUBLISHED"
        },
        new CoursePaymentDto
        {
            CourseId = 3,
            Title = "Advanced Gala Hosting",
            Description = "Advanced MC hosting course.",
            ThumbnailUrl = "https://placehold.co/800x450?text=Advanced+Gala",
            Price = 899000,
            Status = "DRAFT"
        }
    ];

    public Task<IEnumerable<CoursePaymentDto>> GetPublishedCoursesAsync()
    {
        var result = Courses
            .Where(x => x.Status == "PUBLISHED")
            .ToList();

        return Task.FromResult<IEnumerable<CoursePaymentDto>>(result);
    }

    public Task<CoursePaymentDto?> GetCourseByIdAsync(int courseId)
    {
        var result = Courses.FirstOrDefault(x => x.CourseId == courseId);
        return Task.FromResult(result);
    }
}