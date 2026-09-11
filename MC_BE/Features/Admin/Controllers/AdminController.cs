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
}
