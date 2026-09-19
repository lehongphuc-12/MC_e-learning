using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Controllers.EnrollmentPayment;

[ApiController]
[Route("api/v1/enrollments")]
[Authorize]
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

    [HttpPost("courses/{courseId:int}")]
    public async Task<ActionResult<ApiResponse<EnrollmentDto>>> EnrollCourse(int courseId)
    {
        _currentUserService.RequireLearner();
        var userId = int.Parse(_currentUserService.GetUserId());

        var response = await _enrollmentService.EnrollCourseAsync(userId, courseId);
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<List<EnrollmentDto>>>> GetMyEnrollments()
    {
        var userId = int.Parse(_currentUserService.GetUserId());
        var response = await _enrollmentService.GetMyEnrollmentsAsync(userId);
        return Ok(response);
    }

    [HttpDelete("{enrollmentId:int}")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelPendingEnrollment(int enrollmentId)
    {
        var userId = int.Parse(_currentUserService.GetUserId());
        var response = await _enrollmentService.CancelPendingEnrollmentAsync(userId, enrollmentId);
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }
}