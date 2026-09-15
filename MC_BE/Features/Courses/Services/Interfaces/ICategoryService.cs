using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

/// <summary>
/// Defines the contract for Category read operations.
/// Categories are managed by Admin; Instructors only read them for dropdowns.
/// </summary>
public interface ICategoryService
{
    /// <summary>Returns all ACTIVE categories for the form dropdown.</summary>
    Task<List<CategoryDto>> GetAllCategoriesAsync();

    /// <summary>Returns a single category by ID, or null if not found.</summary>
    Task<CategoryDto?> GetCategoryByIdAsync(int categoryId);
}
