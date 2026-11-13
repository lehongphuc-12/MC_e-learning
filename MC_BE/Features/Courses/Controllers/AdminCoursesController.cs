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
    private readonly ICourseGiftAccessService _courseGiftAccessService;

    public AdminCoursesController(ICourseService courseService, ICourseGiftAccessService courseGiftAccessService)
    {
        _courseService = courseService;
        _courseGiftAccessService = courseGiftAccessService;
    }

    [HttpGet("gift-policy")]
    public async Task<ActionResult<ApiResponse<CourseGiftPolicyDto>>> GetGiftPolicy(CancellationToken cancellationToken)
    {
        var policy = await _courseGiftAccessService.GetPolicyAsync(cancellationToken);
        return Ok(ApiResponse<CourseGiftPolicyDto>.SuccessResponse(policy));
    }

    [HttpGet("gift-candidates")]
    public async Task<ActionResult<ApiResponse<CourseGiftCandidatesPageDto>>> GetGiftCandidates(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 100, CancellationToken cancellationToken = default)
    {
        var candidates = await _courseGiftAccessService.GetCandidatesAsync(page, pageSize, cancellationToken);
        return Ok(ApiResponse<CourseGiftCandidatesPageDto>.SuccessResponse(candidates));
    }

    [HttpPut("gift-policy")]
    public async Task<ActionResult<ApiResponse<CourseGiftPolicyDto>>> UpdateGiftPolicy(
        [FromBody] UpdateCourseGiftPolicyRequest request, CancellationToken cancellationToken)
    {
        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<CourseGiftPolicyDto>.FailureResponse("Unauthorized."));
        try
        {
            var policy = await _courseGiftAccessService.UpdatePolicyAsync(request, adminId.Value, cancellationToken);
            return Ok(ApiResponse<CourseGiftPolicyDto>.SuccessResponse(policy, "Đã cập nhật chính sách tặng khóa AI."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<CourseGiftPolicyDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<CourseGiftPolicyDto>.FailureResponse(ex.Message));
        }
    }

    private int? GetCurrentAdminId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
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

    // -------------------------------------------------------------------------
    // GET /api/admin/courses/pending
    // Returns courses with PENDING_APPROVAL status (Admin Tab 1)
    // -------------------------------------------------------------------------
    [HttpGet("pending")]
    public async Task<ActionResult<ApiResponse<CourseListResponse>>> GetPendingCourses(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? search = null)
    {
        var result = await _courseService.GetAllCoursesAsync(page, limit, "PENDING_APPROVAL", categoryId, search);
        return Ok(ApiResponse<CourseListResponse>.SuccessResponse(result));
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/courses/approved
    // Returns courses with PUBLISHED status (Admin Tab 2)
    // -------------------------------------------------------------------------
    [HttpGet("approved")]
    public async Task<ActionResult<ApiResponse<CourseListResponse>>> GetApprovedCourses(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? search = null)
    {
        var result = await _courseService.GetAllCoursesAsync(page, limit, "PUBLISHED", categoryId, search);
        return Ok(ApiResponse<CourseListResponse>.SuccessResponse(result));
    }

    [HttpGet("deletion-requests")]
    public async Task<ActionResult<ApiResponse<CourseDeletionRequestListDto>>> GetDeletionRequests(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _courseService.GetPendingCourseDeletionRequestsAsync(page, pageSize);
        return Ok(ApiResponse<CourseDeletionRequestListDto>.SuccessResponse(result));
    }

    [HttpPost("deletion-requests/{requestId:long}/approve")]
    public Task<ActionResult<ApiResponse<CourseDeletionActionDto>>> ApproveDeletionRequest(
        long requestId, [FromBody] ReviewCourseDeletionRequest request) => ReviewDeletionRequest(requestId, request, true);

    [HttpPost("deletion-requests/{requestId:long}/reject")]
    public Task<ActionResult<ApiResponse<CourseDeletionActionDto>>> RejectDeletionRequest(
        long requestId, [FromBody] ReviewCourseDeletionRequest request) => ReviewDeletionRequest(requestId, request, false);

    private async Task<ActionResult<ApiResponse<CourseDeletionActionDto>>> ReviewDeletionRequest(
        long requestId, ReviewCourseDeletionRequest request, bool approve)
    {
        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<CourseDeletionActionDto>.FailureResponse("Unauthorized."));
        try
        {
            var result = await _courseService.ReviewCourseDeletionRequestAsync(
                requestId, adminId.Value, approve, request.AdminNote);
            if (result is null)
                return NotFound(ApiResponse<CourseDeletionActionDto>.FailureResponse("Yêu cầu xóa không tồn tại."));
            return Ok(ApiResponse<CourseDeletionActionDto>.SuccessResponse(result, result.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<CourseDeletionActionDto>.FailureResponse(ex.Message));
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/courses/{id}/approve
    // Approves and publishes the course
    // -------------------------------------------------------------------------
    [HttpPost("{id:int}/approve")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> ApproveCourse(int id)
    {
        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        try
        {
            var result = await _courseService.ApproveCourseAsync(id, adminId.Value);
            if (result is null)
                return NotFound(ApiResponse<CourseDto>.FailureResponse("Khóa học không tồn tại."));
            return Ok(ApiResponse<CourseDto>.SuccessResponse(result, "Phê duyệt và xuất bản khóa học thành công."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<CourseDto>.FailureResponse(ex.Message));
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/courses/{id}/reject
    // Rejects the course with a mandatory reason
    // -------------------------------------------------------------------------
    [HttpPost("{id:int}/reject")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> RejectCourse(int id, [FromBody] RejectCourseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(ApiResponse<CourseDto>.FailureResponse("Lý do từ chối không được để trống."));

        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        var result = await _courseService.RejectCourseAsync(id, adminId.Value, request.Reason);
        if (result is null)
            return NotFound(ApiResponse<CourseDto>.FailureResponse("Khóa học không tồn tại."));

        return Ok(ApiResponse<CourseDto>.SuccessResponse(result, "Đã từ chối khóa học và gửi lý do cho Giảng viên."));
    }
}
