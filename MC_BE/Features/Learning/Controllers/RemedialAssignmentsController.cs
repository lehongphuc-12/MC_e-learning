using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Learning.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public sealed class RemedialAssignmentsController : ControllerBase
{
    private readonly IRemedialAssignmentService _service;
    public RemedialAssignmentsController(IRemedialAssignmentService service) => _service = service;

    private int? UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;

    [HttpGet("instructor/courses/{courseId:int}/remedial-assignments")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<List<RemedialAssignmentDto>>>> GetForInstructor(int courseId)
    {
        try { return Ok(ApiResponse<List<RemedialAssignmentDto>>.SuccessResponse(await _service.GetForInstructorAsync(UserId ?? 0, courseId))); }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<List<RemedialAssignmentDto>>.FailureResponse(ex.Message)); }
    }

    [HttpPost("instructor/courses/{courseId:int}/remedial-assignments")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<RemedialAssignmentDto>>> Create(int courseId, [FromBody] CreateRemedialAssignmentRequest request)
    {
        try
        {
            var result = await _service.CreateOrExtendAsync(UserId ?? 0, courseId, request);
            return Ok(ApiResponse<RemedialAssignmentDto>.SuccessResponse(result, "Đã giao bài bổ trợ cho học viên."));
        }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<RemedialAssignmentDto>.FailureResponse(ex.Message)); }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<RemedialAssignmentDto>.FailureResponse(ex.Message)); }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<RemedialAssignmentDto>.FailureResponse(ex.Message)); }
        catch (InvalidOperationException ex) { return Conflict(ApiResponse<RemedialAssignmentDto>.FailureResponse(ex.Message)); }
    }

    [HttpGet("instructor/remedial-assignments/{assignmentId:int}/history")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<List<RemedialAssignmentEventDto>>>> History(int assignmentId)
    {
        try { return Ok(ApiResponse<List<RemedialAssignmentEventDto>>.SuccessResponse(await _service.GetHistoryAsync(UserId ?? 0, assignmentId))); }
        catch (UnauthorizedAccessException ex) { return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<List<RemedialAssignmentEventDto>>.FailureResponse(ex.Message)); }
        catch (KeyNotFoundException ex) { return NotFound(ApiResponse<List<RemedialAssignmentEventDto>>.FailureResponse(ex.Message)); }
    }

    [HttpGet("learner/courses/{courseId:int}/remedial-assignments")]
    [Authorize(Roles = "Learner")]
    public async Task<ActionResult<ApiResponse<List<RemedialAssignmentDto>>>> GetForLearner(int courseId) =>
        Ok(ApiResponse<List<RemedialAssignmentDto>>.SuccessResponse(await _service.GetForLearnerAsync(UserId ?? 0, courseId)));
}
