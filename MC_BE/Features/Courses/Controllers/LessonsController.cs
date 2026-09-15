using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class LessonsController : ControllerBase
{
    private readonly ILessonService _lessonService;

    public LessonsController(ILessonService lessonService)
    {
        _lessonService = lessonService;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    // GET /api/courses/{courseId}/lessons
    [HttpGet("courses/{courseId:int}/lessons")]
    public async Task<ActionResult<ApiResponse<List<LessonDto>>>> GetLessons(int courseId)
    {
        var lessons = await _lessonService.GetLessonsByCourseIdAsync(courseId);
        return Ok(ApiResponse<List<LessonDto>>.SuccessResponse(lessons));
    }

    // POST /api/courses/{courseId}/lessons
    [HttpPost("courses/{courseId:int}/lessons")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<LessonDto>>> CreateLesson(int courseId, [FromBody] CreateLessonRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<LessonDto>.FailureResponse("Validation failed.", errors));
        }

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<LessonDto>.FailureResponse("Unauthorized."));

        var created = await _lessonService.CreateLessonAsync(courseId, instructorId.Value, request);
        if (created is null)
            return BadRequest(ApiResponse<LessonDto>.FailureResponse("Course not found or creation failed."));

        return Ok(ApiResponse<LessonDto>.SuccessResponse(created, "Lesson created successfully."));
    }

    // POST /api/courses/{courseId}/lessons/bulk
    [HttpPost("courses/{courseId:int}/lessons/bulk")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<List<LessonDto>>>> CreateLessonsBulk(int courseId, [FromBody] List<CreateLessonRequest> requests)
    {
        if (requests == null || !requests.Any())
            return BadRequest(ApiResponse<List<LessonDto>>.FailureResponse("No lesson data provided."));

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<List<LessonDto>>.FailureResponse("Unauthorized."));

        var results = await _lessonService.CreateLessonsBulkAsync(courseId, instructorId.Value, requests);
        return Ok(ApiResponse<List<LessonDto>>.SuccessResponse(results, $"Successfully imported {results.Count} lessons."));
    }

    // PUT /api/lessons/{id}
    [HttpPut("lessons/{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<LessonDto>>> UpdateLesson(int id, [FromBody] UpdateLessonRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<LessonDto>.FailureResponse("Unauthorized."));

        var updated = await _lessonService.UpdateLessonAsync(id, instructorId.Value, request);
        if (updated is null)
            return NotFound(ApiResponse<LessonDto>.FailureResponse("Lesson not found or you are not the owner."));

        return Ok(ApiResponse<LessonDto>.SuccessResponse(updated, "Lesson updated successfully."));
    }

    // DELETE /api/lessons/{id}
    [HttpDelete("lessons/{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteLesson(int id)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<string>.FailureResponse("Unauthorized."));

        var deleted = await _lessonService.DeleteLessonAsync(id, instructorId.Value);
        if (!deleted)
            return NotFound(ApiResponse<string>.FailureResponse("Lesson not found or you are not the owner."));

        return Ok(ApiResponse<string>.SuccessResponse("Deleted", "Lesson deleted successfully."));
    }
}
