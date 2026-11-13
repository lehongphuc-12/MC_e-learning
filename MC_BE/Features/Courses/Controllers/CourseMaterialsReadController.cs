using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Courses.Services.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api/courses/{courseId:int}/materials")]
[Authorize]
public sealed class CourseMaterialsReadController : ControllerBase
{
    private readonly ICourseMaterialsReadService _courseMaterialsReadService;

    public CourseMaterialsReadController(ICourseMaterialsReadService courseMaterialsReadService)
    {
        _courseMaterialsReadService = courseMaterialsReadService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<CourseMaterialReadDto>>>> GetMaterials(
        int courseId,
        CancellationToken cancellationToken)
    {
        var rawId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!int.TryParse(rawId, out var userId))
        {
            return Unauthorized(ApiResponse<List<CourseMaterialReadDto>>.FailureResponse("Unauthorized."));
        }

        var result = await _courseMaterialsReadService.GetMaterialsAsync(
            courseId,
            userId,
            User.IsInRole("Admin"),
            cancellationToken);

        return result.Status switch
        {
            CourseMaterialsReadStatus.CourseNotFound => NotFound(
                ApiResponse<List<CourseMaterialReadDto>>.FailureResponse("Course not found.")),
            CourseMaterialsReadStatus.Forbidden => Forbid(),
            _ => Ok(ApiResponse<List<CourseMaterialReadDto>>.SuccessResponse(result.Materials)),
        };
    }
}
