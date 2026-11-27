using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Admin.DTOs;
using MC_BE.Features.Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Admin.Controllers;

[ApiController, Route("api/admin"), Authorize(Roles = "Admin")]
public sealed class AdminOperationsController(AdminOperationsService service) : ControllerBase
{
    private int AdminId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpGet("activity-logs")]
    public async Task<IActionResult> ActivityLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 25,
        [FromQuery] string? category = null, [FromQuery] string? search = null, [FromQuery] string? action = null,
        [FromQuery] string? entityType = null, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        page = Math.Clamp(page, 1, 100000);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await service.GetLogsAsync(page, pageSize, category, search, action, entityType, from, to);
        return Ok(ApiResponse<PagedItemsDto<ActivityLogItemDto>>.SuccessResponse(result));
    }

    [HttpGet("support-requests")]
    public async Task<IActionResult> SupportRequests([FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null, [FromQuery] string? category = null, [FromQuery] string? search = null)
    {
        var result = await service.GetSupportRequestsAsync(Math.Clamp(page, 1, 100000), Math.Clamp(pageSize, 1, 100), status, category, search);
        return Ok(ApiResponse<PagedItemsDto<SupportRequestDto>>.SuccessResponse(result));
    }

    [HttpGet("support-requests/{id:long}")]
    public async Task<IActionResult> SupportRequest(long id)
    {
        var result = await service.GetSupportRequestAsync(id);
        return result == null ? NotFound(ApiResponse<SupportRequestDto>.FailureResponse("Không tìm thấy yêu cầu hỗ trợ.")) : Ok(ApiResponse<SupportRequestDto>.SuccessResponse(result));
    }

    [HttpPost("support-requests/{id:long}/messages")]
    public async Task<IActionResult> Reply(long id, [FromBody] SupportRequestReplyDto input)
    {
        if (AdminId == 0) return Unauthorized();
        try
        {
            return await service.AddReplyAsync(id, AdminId, true, input)
                ? Ok(ApiResponse<bool>.SuccessResponse(true, "Đã gửi phản hồi."))
                : NotFound(ApiResponse<bool>.FailureResponse("Không tìm thấy yêu cầu hỗ trợ."));
        }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message)); }
    }

    [HttpPut("support-requests/{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] SupportRequestUpdateDto input)
    {
        if (AdminId == 0) return Unauthorized();
        try
        {
            return await service.UpdateSupportRequestAsync(id, AdminId, input)
                ? Ok(ApiResponse<bool>.SuccessResponse(true, "Đã cập nhật yêu cầu hỗ trợ."))
                : NotFound(ApiResponse<bool>.FailureResponse("Không tìm thấy yêu cầu hỗ trợ."));
        }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message)); }
    }
}

[ApiController, Route("api/support-requests"), Authorize]
public sealed class SupportRequestsController(AdminOperationsService service) : ControllerBase
{
    private int CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSupportRequestDto input)
    {
        if (CurrentUserId == 0) return Unauthorized();
        try
        {
            var ticket = await service.CreateSupportRequestAsync(CurrentUserId, input);
            return Ok(ApiResponse<SupportRequestDto>.SuccessResponse(ticket, "Đã gửi yêu cầu hỗ trợ."));
        }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<SupportRequestDto>.FailureResponse(ex.Message)); }
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (CurrentUserId == 0) return Unauthorized();
        var result = await service.GetMySupportRequestsAsync(CurrentUserId, Math.Clamp(page, 1, 100000), Math.Clamp(pageSize, 1, 100));
        return Ok(ApiResponse<PagedItemsDto<SupportRequestDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetMine(long id)
    {
        if (CurrentUserId == 0) return Unauthorized();
        var ticket = await service.GetSupportRequestAsync(id, false);
        if (ticket == null || ticket.RequesterUserId != CurrentUserId) return NotFound(ApiResponse<SupportRequestDto>.FailureResponse("Không tìm thấy yêu cầu hỗ trợ."));
        return Ok(ApiResponse<SupportRequestDto>.SuccessResponse(ticket));
    }

    [HttpPost("{id:long}/messages")]
    public async Task<IActionResult> Reply(long id, [FromBody] SupportRequestReplyDto input)
    {
        if (CurrentUserId == 0) return Unauthorized();
        try
        {
            return await service.AddReplyAsync(id, CurrentUserId, false, input)
                ? Ok(ApiResponse<bool>.SuccessResponse(true, "Đã gửi phản hồi."))
                : NotFound(ApiResponse<bool>.FailureResponse("Không tìm thấy yêu cầu hỗ trợ."));
        }
        catch (ArgumentException ex) { return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
