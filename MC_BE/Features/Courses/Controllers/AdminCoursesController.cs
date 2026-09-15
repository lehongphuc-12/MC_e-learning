using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

/// <summary>
/// Admin-only endpoint for viewing ALL courses across all instructors.
/// Route: GET /api/admin/courses
/// This sits alongside the existing AdminController in Features/Admin/
/// to keep course-related admin logic in the Courses feature folder.
/// </summary>
[ApiController]
[Route("api/admin/courses")]
[Authorize(Roles = "Admin")]
public class AdminCoursesController : ControllerBase
{
    private readonly ICourseService _courseService;

    public AdminCoursesController(ICourseService courseService)
    {
        _courseService = courseService;
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/courses
    // Returns ALL courses with full pagination + filtering (Admin view)
    // -------------------------------------------------------------------------
    [HttpGet]
    public async Task<ActionResult<ApiResponse<CourseListResponse>>> GetAllCourses(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? status = null,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? search = null)
    {
        var result = await _courseService.GetAllCoursesAsync(page, limit, status, categoryId, search);
        return Ok(ApiResponse<CourseListResponse>.SuccessResponse(result));
    }
}
