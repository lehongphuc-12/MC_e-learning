using MC_BE.Core.DTOs;
using MC_BE.Features.Admin.DTOs;
using MC_BE.Features.Users.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Admin.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IUserService _userService;

    public AdminController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<List<AdminUserDto>>>> GetUsers()
    {
        var result = await _userService.GetAllUsersForAdminAsync();
        return Ok(result);
    }

    [HttpPut("users/{id}/status")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateUserStatus(int id, [FromBody] UpdateUserStatusRequest request)
    {
        var result = await _userService.UpdateUserStatusAsync(id, request.Status);
        if (!result.Success)
            return result.Message == "User not found." ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    [HttpPut("users/{id}")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> UpdateUser(int id, [FromBody] AdminUpdateUserRequest request)
    {
        var result = await _userService.AdminUpdateUserAsync(id, request);
        if (!result.Success)
            return result.Message == "User not found." ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }
}

