using System.Security.Claims;
using MC_BE.Features.Enrollment.DTO;
using MC_BE.Features.Enrollment.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Enrollment.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/enrollments/access-extensions")]
public sealed class CourseAccessExtensionController(ICourseAccessExtensionService service) : ControllerBase
{
    private int CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpPost("{enrollmentId:int}")]
    [Authorize(Roles = "Learner")]
    public async Task<IActionResult> Create(int enrollmentId, [FromBody] CreateAccessExtensionRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(new { success = true, data = await service.CreateAsync(CurrentUserId, enrollmentId, request, cancellationToken) }); }
        catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
        catch (DbUpdateException) { return Conflict(new { success = false, message = "Đã có yêu cầu gia hạn đang chờ cho khóa học này." }); }
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Learner")]
    public async Task<IActionResult> Mine(CancellationToken cancellationToken) => Ok(new { success = true, data = await service.GetMineAsync(CurrentUserId, cancellationToken) });

    [HttpGet("pending")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Pending(CancellationToken cancellationToken) => Ok(new { success = true, data = await service.GetPendingAsync(cancellationToken) });

    [HttpPost("{requestId:long}/approve")]
    [Authorize(Roles = "Admin")]
    public Task<IActionResult> Approve(long requestId, [FromBody] DecideAccessExtensionRequest request, CancellationToken cancellationToken) => Decide(requestId, true, request, cancellationToken);

    [HttpPost("{requestId:long}/reject")]
    [Authorize(Roles = "Admin")]
    public Task<IActionResult> Reject(long requestId, [FromBody] DecideAccessExtensionRequest request, CancellationToken cancellationToken) => Decide(requestId, false, request, cancellationToken);

    private async Task<IActionResult> Decide(long requestId, bool approve, DecideAccessExtensionRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(new { success = true, data = await service.DecideAsync(requestId, CurrentUserId, approve, request, cancellationToken) }); }
        catch (KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
    }
}
