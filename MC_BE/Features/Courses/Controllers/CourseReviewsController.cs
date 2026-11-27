using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api/courses/{courseId:int}/reviews")]
public sealed class CourseReviewsController(ICourseReviewService reviewService) : ControllerBase
{
    private int? CurrentUserId => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CourseReviewListDto>>> GetReviews(
        int courseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await reviewService.GetPublishedReviewsAsync(courseId, page, pageSize);
        if (result is null)
            return NotFound(ApiResponse<CourseReviewListDto>.FailureResponse("Không tìm thấy khóa học."));

        return Ok(ApiResponse<CourseReviewListDto>.SuccessResponse(result));
    }

    [HttpGet("me")]
    [Authorize(Roles = "Learner")]
    public async Task<ActionResult<ApiResponse<CourseReviewEligibilityDto>>> GetMyReview(int courseId)
    {
        var learnerId = CurrentUserId;
        if (learnerId is null)
            return Unauthorized(ApiResponse<CourseReviewEligibilityDto>.FailureResponse("Vui lòng đăng nhập lại."));

        var result = await reviewService.GetLearnerReviewAsync(learnerId.Value, courseId);
        if (result is null)
            return NotFound(ApiResponse<CourseReviewEligibilityDto>.FailureResponse("Không tìm thấy khóa học."));

        return Ok(ApiResponse<CourseReviewEligibilityDto>.SuccessResponse(result));
    }

    [HttpPost]
    [Authorize(Roles = "Learner")]
    public async Task<ActionResult<ApiResponse<CourseReviewEligibilityDto>>> SubmitReview(
        int courseId,
        [FromBody] SubmitCourseReviewRequest request)
    {
        var learnerId = CurrentUserId;
        if (learnerId is null)
            return Unauthorized(ApiResponse<CourseReviewEligibilityDto>.FailureResponse("Vui lòng đăng nhập lại."));

        try
        {
            var result = await reviewService.SubmitOrUpdateLearnerReviewAsync(learnerId.Value, courseId, request);
            if (result is null)
                return NotFound(ApiResponse<CourseReviewEligibilityDto>.FailureResponse("Không tìm thấy khóa học."));

            return Ok(ApiResponse<CourseReviewEligibilityDto>.SuccessResponse(result, "Cảm ơn bạn đã chia sẻ trải nghiệm học tập."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<CourseReviewEligibilityDto>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<CourseReviewEligibilityDto>.FailureResponse(
                "Đánh giá vừa được cập nhật ở phiên khác. Hãy tải lại đánh giá của bạn rồi thử lại."));
        }
    }

    [HttpDelete("me")]
    [Authorize(Roles = "Learner")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteMyReview(int courseId)
    {
        var learnerId = CurrentUserId;
        if (learnerId is null)
            return Unauthorized(ApiResponse<object>.FailureResponse("Vui lòng đăng nhập lại."));

        var deleted = await reviewService.DeleteLearnerReviewAsync(learnerId.Value, courseId);
        if (!deleted)
            return NotFound(ApiResponse<object>.FailureResponse("Bạn chưa có đánh giá để xóa."));
        return Ok(ApiResponse<object>.SuccessResponse(new { }, "Đã xóa đánh giá của bạn."));
    }

    [HttpPost("{reviewId:int}/reports")]
    [Authorize(Roles = "Learner")]
    public async Task<ActionResult<ApiResponse<CourseReviewReportResultDto>>> ReportReview(
        int courseId,
        int reviewId,
        [FromBody] CreateCourseReviewReportRequest request)
    {
        var learnerId = CurrentUserId;
        if (learnerId is null)
            return Unauthorized(ApiResponse<CourseReviewReportResultDto>.FailureResponse("Vui lòng đăng nhập lại."));

        try
        {
            var result = await reviewService.CreateReportAsync(learnerId.Value, courseId, reviewId, request);
            if (result is null)
                return NotFound(ApiResponse<CourseReviewReportResultDto>.FailureResponse("Đánh giá không còn khả dụng để báo cáo."));
            return Ok(ApiResponse<CourseReviewReportResultDto>.SuccessResponse(result, "Báo cáo đã được gửi cho Admin xem xét."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<CourseReviewReportResultDto>.FailureResponse(ex.Message));
        }
        catch (DbUpdateException)
        {
            return Conflict(ApiResponse<CourseReviewReportResultDto>.FailureResponse("Bạn đã gửi báo cáo cho đánh giá này rồi."));
        }
    }
}

[ApiController]
[Route("api/instructor/courses/{courseId:int}/reviews")]
[Authorize(Roles = "Instructor")]
public sealed class InstructorCourseReviewsController(ICourseReviewService reviewService) : ControllerBase
{
    private int? CurrentUserId => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    [HttpGet]
    public async Task<ActionResult<ApiResponse<CourseReviewListDto>>> GetReviews(
        int courseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var instructorId = CurrentUserId;
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseReviewListDto>.FailureResponse("Vui lòng đăng nhập lại."));

        var result = await reviewService.GetInstructorReviewsAsync(instructorId.Value, courseId, page, pageSize);
        if (result is null)
            return NotFound(ApiResponse<CourseReviewListDto>.FailureResponse("Không tìm thấy khóa học hoặc bạn không sở hữu khóa học này."));

        return Ok(ApiResponse<CourseReviewListDto>.SuccessResponse(result));
    }
}
