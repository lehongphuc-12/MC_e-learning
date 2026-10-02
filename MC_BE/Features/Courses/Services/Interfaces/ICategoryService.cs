using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

/// <summary>
/// Defines the contract for Category management operations.
/// </summary>
public interface ICategoryService
{
    /// <summary>Returns all ACTIVE categories for public form dropdowns.</summary>
    Task<List<CategoryDto>> GetAllCategoriesAsync();

    /// <summary>Returns a single category by ID, or null if not found.</summary>
    Task<CategoryDto?> GetCategoryByIdAsync(int categoryId);

    /// <summary>Returns all categories (ACTIVE & INACTIVE) for Admin management.</summary>
    Task<List<CategoryDto>> GetAdminCategoriesAsync();

    /// <summary>Creates a new category.</summary>
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryRequest request);

    /// <summary>Updates an existing category by ID.</summary>
    Task<CategoryDto?> UpdateCategoryAsync(int categoryId, UpdateCategoryRequest request);

    /// <summary>Deletes a category or sets it to INACTIVE if courses exist.</summary>
    Task<bool> DeleteCategoryAsync(int categoryId);

    /// <summary>Toggles a category's status between ACTIVE and INACTIVE.</summary>
    Task<bool> ToggleCategoryStatusAsync(int categoryId);
}

