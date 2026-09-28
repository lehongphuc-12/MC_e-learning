using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Learning.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LearningController : ControllerBase
{
    private readonly ILearningProgressService _learningProgressService;

    public LearningController(ILearningProgressService learningProgressService)
    {
        _learningProgressService = learningProgressService;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/learning/courses/{courseId}/progress
    /// Get course learning progress for current learner
    /// </summary>
    [HttpGet("courses/{courseId:int}/progress")]
    public async Task<ActionResult<ApiResponse<CourseLearningProgressDto>>> GetCourseProgress(int courseId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CourseLearningProgressDto>.FailureResponse("Unauthorized."));
        }

        var progress = await _learningProgressService.GetCourseProgressAsync(learnerId.Value, courseId);
        if (progress == null)
        {
            return NotFound(ApiResponse<CourseLearningProgressDto>.FailureResponse("Learner enrollment or course not found."));
        }

        return Ok(ApiResponse<CourseLearningProgressDto>.SuccessResponse(progress, "Course progress retrieved successfully."));
    }

    /// <summary>
    /// PUT /api/learning/lessons/{lessonId}/progress
    /// Update lesson progress idempotently (time spent, video position, completion status)
    /// </summary>
    [HttpPut("lessons/{lessonId:int}/progress")]
    public async Task<ActionResult<ApiResponse<CourseLearningProgressDto>>> UpdateLessonProgress(
        int lessonId, [FromBody] UpdateLessonProgressRequest request)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CourseLearningProgressDto>.FailureResponse("Unauthorized."));
        }

        var updatedProgress = await _learningProgressService.UpdateLessonProgressAsync(learnerId.Value, lessonId, request);
        if (updatedProgress == null)
        {
            return NotFound(ApiResponse<CourseLearningProgressDto>.FailureResponse("Lesson or enrollment not found."));
        }

        return Ok(ApiResponse<CourseLearningProgressDto>.SuccessResponse(updatedProgress, "Lesson progress updated successfully."));
    }

    /// <summary>
    /// GET /api/learning/activity-logs
    /// Get recent learning activities for the user
    /// </summary>
    [HttpGet("activity-logs")]
    public async Task<ActionResult<ApiResponse<List<ActivityLogDto>>>> GetActivityLogs([FromQuery] int limit = 10)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<List<ActivityLogDto>>.FailureResponse("Unauthorized."));
        }

        var activities = await _learningProgressService.GetRecentActivitiesAsync(learnerId.Value, limit);
        return Ok(ApiResponse<List<ActivityLogDto>>.SuccessResponse(activities, "Retrieved activity logs successfully."));
    }
    /// <summary>
    /// GET /api/learning/streak
    /// Get learning streak for the user
    /// </summary>
    [HttpGet("streak")]
    public async Task<ActionResult<ApiResponse<LearningStreakDto>>> GetLearningStreak()
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<LearningStreakDto>.FailureResponse("Unauthorized."));
        }

        var streak = await _learningProgressService.GetLearningStreakAsync(learnerId.Value);
        return Ok(ApiResponse<LearningStreakDto>.SuccessResponse(streak, "Retrieved streak successfully."));
    }
}
