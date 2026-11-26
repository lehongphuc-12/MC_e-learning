using System.Collections.Generic;
using System.Linq;
using System;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
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
    private readonly SmartMcDbContext _db;
    private readonly IEnrollmentService _enrollmentService;
    private readonly ICurrentUserService _currentUserService;
    public EnrollmentController(IEnrollmentService enrollmentService, ICurrentUserService currentUserService, SmartMcDbContext db)
    {
        _db = db;
        _enrollmentService = enrollmentService;
        _currentUserService = currentUserService;
    }
    // One authorized aggregate request for the instructor dashboard (no N+1 calls).
    // Count active, non-expired learners; exclude unpaid and expired enrollments.
    [HttpGet("instructor/course-stats")]
    [Authorize(Roles = "Instructor")]
    public async Task<IActionResult> GetInstructorCourseStats()
    {
        var instructorId = int.Parse(_currentUserService.GetUserId());
        var now = DateTime.UtcNow;
        var rows = await _db.Enrollments.AsNoTracking()
            .Where(e => e.Course.InstructorId == instructorId &&
                        e.Status == "ACTIVE" &&
                        (!e.ExpiresAt.HasValue || e.ExpiresAt.Value > now))
            .GroupBy(e => e.CourseId)
            .Select(g => new
            {
                CourseId = g.Key,
                StudentCount = g.Select(e => e.LearnerId).Distinct().Count()
            })
            .ToListAsync();

        return Ok(new { success = true, data = rows });
    }

    [HttpPost("courses/{courseId:int}")]
    public async Task<ActionResult<ApiResponse<EnrollmentDto>>> EnrollCourse(int courseId)
    {
        _currentUserService.RequireLearner();
        var userId = int.Parse(_currentUserService.GetUserId());
        var response = await _enrollmentService.EnrollCourseAsync(userId, courseId);
        if (!response.Success) return BadRequest(response);
        return Ok(response);
    }
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<List<EnrollmentDto>>>> GetMyEnrollments()
    {
        _currentUserService.RequireLearner();
        var userId = int.Parse(_currentUserService.GetUserId());
        var response = await _enrollmentService.GetMyEnrollmentsAsync(userId);
        return Ok(response);
    }
    [HttpDelete("{enrollmentId:int}")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelPendingEnrollment(int enrollmentId)
    {
        _currentUserService.RequireLearner();
        var userId = int.Parse(_currentUserService.GetUserId());
        var response = await _enrollmentService.CancelPendingEnrollmentAsync(userId, enrollmentId);
        if (!response.Success) return BadRequest(response);
        return Ok(response);
    }
    [HttpGet("courses/{courseId:int}/students")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<List<CourseEnrolledStudentDto>>>> GetCourseStudents(int courseId)
    {
        var instructorId = int.Parse(_currentUserService.GetUserId());
        var response = await _enrollmentService.GetCourseStudentsAsync(instructorId, courseId);
        if (!response.Success) return BadRequest(response);
        return Ok(response);
    }

    [HttpGet("courses/{courseId:int}/students/insights")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<List<CourseStudentInsightDto>>>> GetCourseStudentInsights(int courseId)
    {
        var instructorId = int.Parse(_currentUserService.GetUserId());
        var response = await _enrollmentService.GetCourseStudentInsightsAsync(instructorId, courseId);
        if (!response.Success) return BadRequest(response);
        return Ok(response);
    }
}
