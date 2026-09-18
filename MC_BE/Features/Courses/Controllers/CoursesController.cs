using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

/// <summary>
/// CoursesController — handles all course CRUD for Instructor and Admin roles.
///
/// Routes:
///   GET    /api/courses/my-courses         → Instructor's own courses (paginated)
///   GET    /api/courses/:id                → Single course detail
///   POST   /api/courses                    → Create new course (Instructor)
///   PUT    /api/courses/:id                → Update course (Instructor)
///   DELETE /api/courses/:id                → Delete course (Instructor)
///   PATCH  /api/courses/:id/status         → Quick status toggle
///   GET    /api/admin/courses              → All courses (Admin) — see AdminCoursesController
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize] // All endpoints require authentication by default
public class CoursesController : ControllerBase
{
    private readonly ICourseService _courseService;

    public CoursesController(ICourseService courseService)
    {
        _courseService = courseService;
    }

    // ── Helper: extract InstructorID from JWT claims ──────────────────────────
    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    // -------------------------------------------------------------------------
    // GET /api/courses
    // Public endpoint to get all courses (paginated, filtered, searched)
    // Query params: page, limit, status, categoryId, search
    // -------------------------------------------------------------------------
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CourseListResponse>>> GetCourses(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? status = null,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? search = null)
    {
        var result = await _courseService.GetAllCoursesAsync(page, limit, status, categoryId, search);
        return Ok(ApiResponse<CourseListResponse>.SuccessResponse(result));
    }

    // -------------------------------------------------------------------------
    // GET /api/courses/my-courses
    // Returns the authenticated instructor's own courses.
    // Query params: page, limit, status, categoryId, search
    // -------------------------------------------------------------------------
    [HttpGet("my-courses")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseListResponse>>> GetMyCourses(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? status = null,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? search = null)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseListResponse>.FailureResponse("Unauthorized."));

        var result = await _courseService.GetInstructorCoursesAsync(
            instructorId.Value, page, limit, status, categoryId, search);

        return Ok(ApiResponse<CourseListResponse>.SuccessResponse(result));
    }

    // -------------------------------------------------------------------------
    // GET /api/courses/{id}
    // Returns a single course (accessible to authenticated users)
    // -------------------------------------------------------------------------
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> GetCourse(int id)
    {
        var course = await _courseService.GetCourseByIdAsync(id);
        if (course is null)
            return NotFound(ApiResponse<CourseDto>.FailureResponse($"Course with ID {id} not found."));

        return Ok(ApiResponse<CourseDto>.SuccessResponse(course));
    }

    // -------------------------------------------------------------------------
    // POST /api/courses
    // Creates a new course. InstructorID is taken from the JWT (not the body).
    // -------------------------------------------------------------------------
    [HttpPost]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> CreateCourse([FromBody] CreateCourseRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<CourseDto>.FailureResponse("Validation failed.", errors));
        }

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        var created = await _courseService.CreateCourseAsync(instructorId.Value, request);
        if (created is null)
            return BadRequest(ApiResponse<CourseDto>.FailureResponse("Invalid category ID or creation failed."));

        // 201 Created with Location header pointing to the new resource
        return CreatedAtAction(nameof(GetCourse), new { id = created.CourseId },
            ApiResponse<CourseDto>.SuccessResponse(created, "Course created successfully."));
    }

    // -------------------------------------------------------------------------
    // POST /api/courses/bulk
    // Creates multiple courses in bulk.
    // -------------------------------------------------------------------------
    [HttpPost("bulk")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<List<CourseDto>>>> CreateCoursesBulk([FromBody] List<CreateCourseRequest> requests)
    {
        if (requests == null || !requests.Any())
            return BadRequest(ApiResponse<List<CourseDto>>.FailureResponse("No course data provided."));

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<List<CourseDto>>.FailureResponse("Unauthorized."));

        var results = await _courseService.CreateCoursesBulkAsync(instructorId.Value, requests);
        return Ok(ApiResponse<List<CourseDto>>.SuccessResponse(results, $"Successfully imported {results.Count} courses."));
    }

    // -------------------------------------------------------------------------
    // PUT /api/courses/{id}
    // Updates a course. Only the course owner can update it.
    // -------------------------------------------------------------------------
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> UpdateCourse(
        int id, [FromBody] UpdateCourseRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<CourseDto>.FailureResponse("Validation failed.", errors));
        }

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        var updated = await _courseService.UpdateCourseAsync(id, instructorId.Value, request);
        if (updated is null)
            return NotFound(ApiResponse<CourseDto>.FailureResponse("Course not found or you are not the owner."));

        return Ok(ApiResponse<CourseDto>.SuccessResponse(updated, "Course updated successfully."));
    }

    // -------------------------------------------------------------------------
    // DELETE /api/courses/{id}
    // Hard-deletes a course. Only the owner can delete.
    // -------------------------------------------------------------------------
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteCourse(int id)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<string>.FailureResponse("Unauthorized."));

        var deleted = await _courseService.DeleteCourseAsync(id, instructorId.Value);
        if (!deleted)
            return NotFound(ApiResponse<string>.FailureResponse("Course not found or you are not the owner."));

        return Ok(ApiResponse<string>.SuccessResponse("Deleted", "Course deleted successfully."));
    }

    // -------------------------------------------------------------------------
    // PATCH /api/courses/{id}/status
    // Quick status toggle — DRAFT ↔ PUBLISHED ↔ ARCHIVED
    // -------------------------------------------------------------------------
    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> UpdateCourseStatus(
        int id, [FromBody] UpdateCourseStatusRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        var updated = await _courseService.UpdateCourseStatusAsync(
            id, instructorId.Value, request.Status.ToString());

        if (updated is null)
            return NotFound(ApiResponse<CourseDto>.FailureResponse("Course not found or you are not the owner."));

        return Ok(ApiResponse<CourseDto>.SuccessResponse(updated, $"Course status updated to {request.Status}."));
    }
}
