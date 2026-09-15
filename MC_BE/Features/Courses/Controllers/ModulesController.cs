using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ModulesController : ControllerBase
{
    private readonly IModuleService _moduleService;

    public ModulesController(IModuleService moduleService)
    {
        _moduleService = moduleService;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    // GET /api/courses/{courseId}/modules
    [HttpGet("courses/{courseId:int}/modules")]
    public async Task<ActionResult<ApiResponse<List<ModuleDto>>>> GetModules(int courseId)
    {
        var modules = await _moduleService.GetModulesByCourseIdAsync(courseId);
        return Ok(ApiResponse<List<ModuleDto>>.SuccessResponse(modules));
    }

    // POST /api/courses/{courseId}/modules
    [HttpPost("courses/{courseId:int}/modules")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<ModuleDto>>> CreateModule(int courseId, [FromBody] CreateModuleRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<ModuleDto>.FailureResponse("Validation failed.", errors));
        }

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<ModuleDto>.FailureResponse("Unauthorized."));

        var created = await _moduleService.CreateModuleAsync(courseId, instructorId.Value, request);
        if (created is null)
            return BadRequest(ApiResponse<ModuleDto>.FailureResponse("Course not found or creation failed."));

        return Ok(ApiResponse<ModuleDto>.SuccessResponse(created, "Module created successfully."));
    }

    // POST /api/courses/{courseId}/modules/bulk
    [HttpPost("courses/{courseId:int}/modules/bulk")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<List<ModuleDto>>>> CreateModulesBulk(int courseId, [FromBody] List<BulkImportModuleItemRequest> requests)
    {
        if (requests == null || !requests.Any())
            return BadRequest(ApiResponse<List<ModuleDto>>.FailureResponse("No module data provided."));

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<List<ModuleDto>>.FailureResponse("Unauthorized."));

        var results = await _moduleService.CreateModulesBulkAsync(courseId, instructorId.Value, requests);
        return Ok(ApiResponse<List<ModuleDto>>.SuccessResponse(results, $"Successfully imported {results.Count} modules."));
    }

    // PUT /api/modules/{id}
    [HttpPut("modules/{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<ModuleDto>>> UpdateModule(int id, [FromBody] UpdateModuleRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<ModuleDto>.FailureResponse("Unauthorized."));

        var updated = await _moduleService.UpdateModuleAsync(id, instructorId.Value, request);
        if (updated is null)
            return NotFound(ApiResponse<ModuleDto>.FailureResponse("Module not found or you are not the owner."));

        return Ok(ApiResponse<ModuleDto>.SuccessResponse(updated, "Module updated successfully."));
    }

    // DELETE /api/modules/{id}
    [HttpDelete("modules/{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteModule(int id)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<string>.FailureResponse("Unauthorized."));

        var deleted = await _moduleService.DeleteModuleAsync(id, instructorId.Value);
        if (!deleted)
            return NotFound(ApiResponse<string>.FailureResponse("Module not found or you are not the owner."));

        return Ok(ApiResponse<string>.SuccessResponse("Deleted", "Module deleted successfully."));
    }
}
