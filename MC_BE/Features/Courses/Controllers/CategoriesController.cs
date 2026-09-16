using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

/// <summary>
/// CategoriesController — read-only category endpoints for populating form dropdowns.
///
/// Routes:
///   GET /api/categories        → All active categories
///   GET /api/categories/{id}   → Single category by ID
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    // -------------------------------------------------------------------------
    // GET /api/categories
    // Returns all ACTIVE categories. No auth required (public dropdown data).
    // -------------------------------------------------------------------------
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<CategoryDto>>>> GetCategories()
    {
        var categories = await _categoryService.GetAllCategoriesAsync();
        return Ok(ApiResponse<List<CategoryDto>>.SuccessResponse(categories));
    }

    // -------------------------------------------------------------------------
    // GET /api/categories/{id}
    // -------------------------------------------------------------------------
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> GetCategory(int id)
    {
        var category = await _categoryService.GetCategoryByIdAsync(id);
        if (category is null)
            return NotFound(ApiResponse<CategoryDto>.FailureResponse($"Category with ID {id} not found."));

        return Ok(ApiResponse<CategoryDto>.SuccessResponse(category));
    }
}
