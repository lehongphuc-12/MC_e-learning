using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

public class CategoryService : ICategoryService
{
    private readonly IGenericRepository<Category> _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CategoryService(
        IGenericRepository<Category> categoryRepository,
        IUnitOfWork unitOfWork)
    {
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<CategoryDto>> GetAllCategoriesAsync()
    {
        return await _categoryRepository.GetQueryable()
            .Where(c => c.Status == CategoryStatus.ACTIVE)
            .OrderBy(c => c.CategoryName)
            .Select(c => new CategoryDto
            {
                CategoryId = c.CategoryId,
                CategoryName = c.CategoryName,
                Description = c.Description,
                Status = c.Status.ToString(),
                CoursesCount = c.Courses.Count,
            })
            .ToListAsync();
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(int categoryId)
    {
        var cat = await _categoryRepository.GetQueryable()
            .Include(c => c.Courses)
            .FirstOrDefaultAsync(c => c.CategoryId == categoryId);

        if (cat is null) return null;

        return new CategoryDto
        {
            CategoryId   = cat.CategoryId,
            CategoryName = cat.CategoryName,
            Description  = cat.Description,
            Status       = cat.Status.ToString(),
            CoursesCount = cat.Courses.Count,
        };
    }

    public async Task<List<CategoryDto>> GetAdminCategoriesAsync()
    {
        return await _categoryRepository.GetQueryable()
            .OrderByDescending(c => c.CategoryId)
            .Select(c => new CategoryDto
            {
                CategoryId = c.CategoryId,
                CategoryName = c.CategoryName,
                Description = c.Description,
                Status = c.Status.ToString(),
                CoursesCount = c.Courses.Count,
            })
            .ToListAsync();
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request)
    {
        var status = Enum.TryParse<CategoryStatus>(request.Status, true, out var parsedStatus)
            ? parsedStatus
            : CategoryStatus.ACTIVE;

        var entity = new Category
        {
            CategoryName = request.CategoryName.Trim(),
            Description = request.Description?.Trim(),
            Status = status,
        };

        await _categoryRepository.AddAsync(entity);
        await _unitOfWork.SaveChangesAsync();

        return new CategoryDto
        {
            CategoryId = entity.CategoryId,
            CategoryName = entity.CategoryName,
            Description = entity.Description,
            Status = entity.Status.ToString(),
            CoursesCount = 0,
        };
    }

    public async Task<CategoryDto?> UpdateCategoryAsync(int categoryId, UpdateCategoryRequest request)
    {
        var category = await _categoryRepository.GetQueryable()
            .Include(c => c.Courses)
            .FirstOrDefaultAsync(c => c.CategoryId == categoryId);

        if (category is null) return null;

        category.CategoryName = request.CategoryName.Trim();
        category.Description = request.Description?.Trim();

        if (Enum.TryParse<CategoryStatus>(request.Status, true, out var parsedStatus))
        {
            category.Status = parsedStatus;
        }

        _categoryRepository.Update(category);
        await _unitOfWork.SaveChangesAsync();

        return new CategoryDto
        {
            CategoryId = category.CategoryId,
            CategoryName = category.CategoryName,
            Description = category.Description,
            Status = category.Status.ToString(),
            CoursesCount = category.Courses.Count,
        };
    }

    public async Task<bool> DeleteCategoryAsync(int categoryId)
    {
        var category = await _categoryRepository.GetQueryable()
            .Include(c => c.Courses)
            .FirstOrDefaultAsync(c => c.CategoryId == categoryId);

        if (category is null) return false;

        // If courses are associated, soft-delete by changing status to INACTIVE
        if (category.Courses != null && category.Courses.Any())
        {
            category.Status = CategoryStatus.INACTIVE;
            _categoryRepository.Update(category);
        }
        else
        {
            _categoryRepository.Remove(category);
        }

        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleCategoryStatusAsync(int categoryId)
    {
        var category = await _categoryRepository.GetByIdAsync(categoryId);
        if (category is null) return false;

        category.Status = category.Status == CategoryStatus.ACTIVE ? CategoryStatus.INACTIVE : CategoryStatus.ACTIVE;
        _categoryRepository.Update(category);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }
}



