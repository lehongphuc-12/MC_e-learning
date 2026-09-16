using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

public class CategoryService : ICategoryService
{
    private readonly SmartMcDbContext _context;

    public CategoryService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<List<CategoryDto>> GetAllCategoriesAsync()
    {
        return await _context.Categories
            .Where(c => c.Status == CategoryStatus.ACTIVE)
            .OrderBy(c => c.CategoryName)
            .Select(c => new CategoryDto
            {
                CategoryId   = c.CategoryId,
                CategoryName = c.CategoryName,
                Description  = c.Description,
                Status       = c.Status.ToString(),
            })
            .ToListAsync();
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(int categoryId)
    {
        var cat = await _context.Categories.FindAsync(categoryId);
        if (cat is null) return null;

        return new CategoryDto
        {
            CategoryId   = cat.CategoryId,
            CategoryName = cat.CategoryName,
            Description  = cat.Description,
            Status       = cat.Status.ToString(),
        };
    }
}
