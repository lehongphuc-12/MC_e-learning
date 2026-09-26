using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

/// <summary>
/// Admin category management endpoints.
/// Route: /api/admin/categories
/// </summary>
[ApiController]
[Route("api/admin/categories")]
[Authorize(Roles = "Admin")]
public class AdminCategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public AdminCategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/categories
    // Returns ALL categories (Active & Inactive) with course counts
    // -------------------------------------------------------------------------
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<CategoryDto>>>> GetAdminCategories()
    {
        var categories = await _categoryService.GetAdminCategoriesAsync();
        return Ok(ApiResponse<List<CategoryDto>>.SuccessResponse(categories));
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/categories
    // Creates a new category
    // -------------------------------------------------------------------------
    [HttpPost]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ApiResponse<CategoryDto>.FailureResponse(errors));
        }

        var created = await _categoryService.CreateCategoryAsync(request);
        return Ok(ApiResponse<CategoryDto>.SuccessResponse(created, "Tạo danh mục mới thành công."));
    }

    // -------------------------------------------------------------------------
    // PUT /api/admin/categories/{id}
    // Updates an existing category
    // -------------------------------------------------------------------------
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> UpdateCategory(int id, [FromBody] UpdateCategoryRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
            return BadRequest(ApiResponse<CategoryDto>.FailureResponse(errors));
        }

        var updated = await _categoryService.UpdateCategoryAsync(id, request);
        if (updated is null)
            return NotFound(ApiResponse<CategoryDto>.FailureResponse($"Không tìm thấy danh mục với ID {id}."));

        return Ok(ApiResponse<CategoryDto>.SuccessResponse(updated, "Cập nhật danh mục thành công."));
    }

    // -------------------------------------------------------------------------
    // DELETE /api/admin/categories/{id}
    // Deletes category (or sets status to INACTIVE if courses are attached)
    // -------------------------------------------------------------------------
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteCategory(int id)
    {
        var result = await _categoryService.DeleteCategoryAsync(id);
        if (!result)
            return NotFound(ApiResponse<bool>.FailureResponse($"Không tìm thấy danh mục với ID {id}."));

        return Ok(ApiResponse<bool>.SuccessResponse(true, "Xóa / ngưng hoạt động danh mục thành công."));
    }

    // -------------------------------------------------------------------------
    // PUT /api/admin/categories/{id}/status
    // Toggles status between ACTIVE and INACTIVE
    // -------------------------------------------------------------------------
    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> ToggleStatus(int id)
    {
        var result = await _categoryService.ToggleCategoryStatusAsync(id);
        if (!result)
            return NotFound(ApiResponse<bool>.FailureResponse($"Không tìm thấy danh mục với ID {id}."));

        return Ok(ApiResponse<bool>.SuccessResponse(true, "Cập nhật trạng thái danh mục thành công."));
    }
}
