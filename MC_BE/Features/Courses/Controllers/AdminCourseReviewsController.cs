using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api/admin/course-reviews")]
[Authorize(Roles = "Admin")]
public sealed class AdminCourseReviewsController(ICourseReviewAdminService reviewAdminService, AdminActivityLogger activityLogger) : ControllerBase
{
    private int? CurrentAdminId => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<AdminCourseReviewPageDto<AdminCourseReviewDto>>>> GetReviews(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? courseId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var result = await reviewAdminService.GetReviewsAsync(page, pageSize, courseId, status, search);
        return Ok(ApiResponse<AdminCourseReviewPageDto<AdminCourseReviewDto>>.SuccessResponse(result));
    }

    [HttpGet("reports")]
    public async Task<ActionResult<ApiResponse<AdminCourseReviewPageDto<AdminCourseReviewReportDto>>>> GetReports(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? courseId = null,
        [FromQuery] string? status = null)
    {
        var result = await reviewAdminService.GetReportsAsync(page, pageSize, courseId, status);
        return Ok(ApiResponse<AdminCourseReviewPageDto<AdminCourseReviewReportDto>>.SuccessResponse(result));
    }

    [HttpGet("actions")]
    public async Task<ActionResult<ApiResponse<AdminCourseReviewPageDto<AdminCourseReviewActionDto>>>> GetActions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] int? courseId = null,
        [FromQuery] int? reviewId = null)
    {
        var result = await reviewAdminService.GetActionsAsync(page, pageSize, courseId, reviewId);
        return Ok(ApiResponse<AdminCourseReviewPageDto<AdminCourseReviewActionDto>>.SuccessResponse(result));
    }

    [HttpPost("reports/{reportId:int}/resolve")]
    public async Task<ActionResult<ApiResponse<object>>> ResolveReport(int reportId, [FromBody] ResolveCourseReviewReportRequest request)
    {
        var adminId = CurrentAdminId;
        if (adminId is null) return Unauthorized(ApiResponse<object>.FailureResponse("Vui lòng đăng nhập lại."));
        try
        {
            if (!await reviewAdminService.ResolveReportAsync(adminId.Value, reportId, request))
                return NotFound(ApiResponse<object>.FailureResponse("Không tìm thấy báo cáo."));
            await activityLogger.RecordAsync(adminId.Value, "COURSE_REVIEW_REPORT_RESOLVED", "COURSE_REVIEW_REPORT", reportId.ToString(), "Xử lý báo cáo đánh giá khóa học.", HttpContext.TraceIdentifier);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Đã lưu kết quả xử lý báo cáo."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("reports/{reportId:int}/start-review")]
    public async Task<ActionResult<ApiResponse<object>>> StartReportReview(int reportId)
    {
        var adminId = CurrentAdminId;
        if (adminId is null) return Unauthorized(ApiResponse<object>.FailureResponse("Vui lòng đăng nhập lại."));
        try
        {
            if (!await reviewAdminService.StartReportReviewAsync(adminId.Value, reportId))
                return NotFound(ApiResponse<object>.FailureResponse("Không tìm thấy báo cáo."));
            await activityLogger.RecordAsync(adminId.Value, "COURSE_REVIEW_REPORT_STARTED", "COURSE_REVIEW_REPORT", reportId.ToString(), "Bắt đầu xem xét báo cáo đánh giá khóa học.", HttpContext.TraceIdentifier);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Đã nhận báo cáo để xem xét."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{reviewId:int}/moderate")]
    public async Task<ActionResult<ApiResponse<object>>> ModerateReview(int reviewId, [FromBody] ModerateCourseReviewRequest request)
    {
        var adminId = CurrentAdminId;
        if (adminId is null) return Unauthorized(ApiResponse<object>.FailureResponse("Vui lòng đăng nhập lại."));
        try
        {
            if (!await reviewAdminService.ModerateReviewAsync(adminId.Value, reviewId, request))
                return NotFound(ApiResponse<object>.FailureResponse("Không tìm thấy đánh giá."));
            await activityLogger.RecordAsync(adminId.Value, "COURSE_REVIEW_MODERATED", "COURSE_REVIEW", reviewId.ToString(), "Cập nhật trạng thái kiểm duyệt đánh giá khóa học.", HttpContext.TraceIdentifier);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Đã cập nhật trạng thái đánh giá."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("courses/{courseId:int}/learners/{learnerId:int}/block")]
    public async Task<ActionResult<ApiResponse<object>>> BlockReviewer(int courseId, int learnerId, [FromBody] BlockCourseReviewerRequest request)
    {
        var adminId = CurrentAdminId;
        if (adminId is null) return Unauthorized(ApiResponse<object>.FailureResponse("Vui lòng đăng nhập lại."));
        try
        {
            if (!await reviewAdminService.BlockReviewerAsync(adminId.Value, courseId, learnerId, request))
                return NotFound(ApiResponse<object>.FailureResponse("Không tìm thấy đánh giá của học viên trong khóa học."));
            await activityLogger.RecordAsync(adminId.Value, "COURSE_REVIEWER_BLOCKED", "COURSE_REVIEW_RESTRICTION", $"{courseId}:{learnerId}", $"Chặn quyền đánh giá khóa học #{courseId} của học viên #{learnerId}.", HttpContext.TraceIdentifier, learnerId);
            return Ok(ApiResponse<object>.SuccessResponse(new { }, "Đã chặn quyền đánh giá khóa học này."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("courses/{courseId:int}/learners/{learnerId:int}/unblock")]
    public async Task<ActionResult<ApiResponse<object>>> UnblockReviewer(int courseId, int learnerId, [FromBody] UnblockCourseReviewerRequest request)
    {
        var adminId = CurrentAdminId;
        if (adminId is null) return Unauthorized(ApiResponse<object>.FailureResponse("Vui lòng đăng nhập lại."));
        if (!await reviewAdminService.UnblockReviewerAsync(adminId.Value, courseId, learnerId, request))
            return NotFound(ApiResponse<object>.FailureResponse("Không có lệnh chặn đang hoạt động cho học viên này."));
        await activityLogger.RecordAsync(adminId.Value, "COURSE_REVIEWER_UNBLOCKED", "COURSE_REVIEW_RESTRICTION", $"{courseId}:{learnerId}", $"Gỡ chặn quyền đánh giá khóa học #{courseId} của học viên #{learnerId}.", HttpContext.TraceIdentifier, learnerId);
        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Đã gỡ chặn quyền đánh giá khóa học."));
    }
}
