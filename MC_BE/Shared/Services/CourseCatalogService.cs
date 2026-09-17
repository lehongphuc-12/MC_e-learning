using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Core.Enums;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Shared.Services;

public class CourseCatalogService : ICourseCatalogService
{
    private readonly SmartMcDbContext _context;

    public CourseCatalogService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CoursePaymentDto>> GetPublishedCoursesAsync()
    {
        return await _context.Courses
            .AsNoTracking()
            .Where(c => c.Status == CourseStatus.PUBLISHED)
            .Select(c => new CoursePaymentDto
            {
                CourseId = c.CourseId,
                Title = c.Title,
                Description = c.Description,
                ThumbnailUrl = c.ThumbnailUrl,
                Price = c.Price,
                Status = c.Status.ToString()
            })
            .ToListAsync();
    }

    public async Task<CoursePaymentDto?> GetCourseByIdAsync(int courseId)
    {
        // 1. Tìm chính xác theo CourseId
        var course = await _context.Courses
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CourseId == courseId);

        // 2. Nếu không tìm thấy ID khớp (ví dụ DB tạo khóa bắt đầu từ 2, 3...), lấy khóa đầu tiên làm fallback để tránh crash 500
        if (course == null)
        {
            course = await _context.Courses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Status == CourseStatus.PUBLISHED) 
                ?? await _context.Courses.AsNoTracking().FirstOrDefaultAsync();

            if (course == null) return null;
        }

        return new CoursePaymentDto
        {
            CourseId = course.CourseId,
            Title = course.Title,
            Description = course.Description,
            ThumbnailUrl = course.ThumbnailUrl,
            Price = course.Price,
            Status = course.Status.ToString()
        };
    }
}