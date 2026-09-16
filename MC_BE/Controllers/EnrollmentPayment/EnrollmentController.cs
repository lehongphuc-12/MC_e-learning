using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.DTOs;
using MC_BE.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MC_BE.Features.EnrollmentPayment;

namespace MC_BE.Controllers.EnrollmentPayment;

[ApiController]
[Authorize]
[Route("api/enrollments")]
public class EnrollmentController : ControllerBase
{
    private readonly IEnrollmentService _enrollmentService;
    private readonly ICurrentUserService _currentUserService;

    public EnrollmentController(
        IEnrollmentService enrollmentService,
        ICurrentUserService currentUserService)
    {
        _enrollmentService = enrollmentService;
        _currentUserService = currentUserService;
    }

    /*
     * LE02: Đăng ký khóa học
     */
    [HttpPost("courses/{courseId:int}")]
    public async Task<ActionResult<ApiResponse<EnrollmentDto>>> EnrollCourse(int courseId)
    {
        try
        {
            var learnerId = int.Parse(_currentUserService.GetUserId());
            var result = await _enrollmentService.EnrollCourseAsync(learnerId, courseId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<EnrollmentDto>.FailureResponse(ex.Message));
        }
    }

    /*
     * LE02: Danh sách khóa học của học viên
     */
    [HttpGet("my")]
    public async Task<ActionResult<ApiResponse<List<EnrollmentDto>>>> GetMyEnrollments()
    {
        try
        {
            var learnerId = int.Parse(_currentUserService.GetUserId());
            var result = await _enrollmentService.GetMyEnrollmentsAsync(learnerId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<List<EnrollmentDto>>.FailureResponse(ex.Message));
        }
    }

    /*
     * LUỒNG 1: Học viên tự hủy đơn đăng ký đang chờ thanh toán
     */
    [HttpPost("{enrollmentId:int}/cancel")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelPendingEnrollment(int enrollmentId)
    {
        try
        {
            var learnerId = int.Parse(_currentUserService.GetUserId());
            var result = await _enrollmentService.CancelPendingEnrollmentAsync(learnerId, enrollmentId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }
}