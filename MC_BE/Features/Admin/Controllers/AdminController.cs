using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MC_BE.Core.DTOs;
using MC_BE.Features.Admin.DTOs;
using MC_BE.Features.Users.Services.Interfaces;
using MC_BE.Features.Admin.Services.Interfaces;
using System.Collections.Generic;
using MC_BE.Shared.Data;

namespace MC_BE.Features.Admin.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAdminStatsService _adminStatsService;
    private readonly SmartMcDbContext _context;

    public AdminController(
        IUserService userService,
        IAdminStatsService adminStatsService,
        SmartMcDbContext context)
    {
        _userService = userService;
        _adminStatsService = adminStatsService;
        _context = context;
    }

    // ============================================================
    // GET DASHBOARD STATS
    // GET /api/admin/stats
    // ============================================================

    [HttpGet("stats")]
    public async Task<ActionResult<ApiResponse<AdminStatsDto>>> GetDashboardStats()
    {
        try
        {
            var stats = await _adminStatsService.GetDashboardStatsAsync();
            return Ok(ApiResponse<AdminStatsDto>.SuccessResponse(stats, "Lấy dữ liệu thống kê Admin thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<AdminStatsDto>.FailureResponse(ex.Message));
        }
    }

    // ============================================================
    // GET REVENUE CHART
    // GET /api/admin/stats/revenue-chart
    // ============================================================

    [HttpGet("stats/revenue-chart")]
    public async Task<ActionResult<ApiResponse<List<RevenueDataPointDto>>>> GetRevenueChart()
    {
        try
        {
            var chartData = await _adminStatsService.GetRevenueChartAsync();
            return Ok(ApiResponse<List<RevenueDataPointDto>>.SuccessResponse(chartData, "Lấy dữ liệu biểu đồ doanh thu thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<RevenueDataPointDto>>.FailureResponse(ex.Message));
        }
    }

    // ============================================================
    // GET SYSTEM LOGS
    // GET /api/admin/logs
    // ============================================================

    [HttpGet("logs")]
    public async Task<ActionResult<ApiResponse<List<SystemLogDto>>>> GetSystemLogs()
    {
        try
        {
            var logs = await _adminStatsService.GetSystemLogsAsync();
            return Ok(ApiResponse<List<SystemLogDto>>.SuccessResponse(logs, "Lấy nhật ký hệ thống thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<SystemLogDto>>.FailureResponse(ex.Message));
        }
    }

    // ============================================================
    // GET PLATFORM SETTINGS
    // GET /api/admin/settings
    // ============================================================

    [HttpGet("settings")]
    public async Task<ActionResult<ApiResponse<PlatformSettingsDto>>> GetPlatformSettings()
    {
        try
        {
            var settings = await _adminStatsService.GetPlatformSettingsAsync();
            return Ok(ApiResponse<PlatformSettingsDto>.SuccessResponse(settings, "Lấy cấu hình hệ thống thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<PlatformSettingsDto>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("/api/system/settings")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<PlatformSettingsDto>>> GetPublicSystemSettings()
    {
        try
        {
            var settings = await _adminStatsService.GetPlatformSettingsAsync();
            return Ok(ApiResponse<PlatformSettingsDto>.SuccessResponse(settings, "Lấy cấu hình hệ thống công khai."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<PlatformSettingsDto>.FailureResponse(ex.Message));
        }
    }

    // ============================================================
    // UPDATE PLATFORM SETTINGS
    // PUT /api/admin/settings
    // ============================================================

    [HttpPut("settings")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdatePlatformSettings([FromBody] PlatformSettingsDto settings)
    {
        try
        {
            var success = await _adminStatsService.UpdatePlatformSettingsAsync(settings);
            return Ok(ApiResponse<bool>.SuccessResponse(success, "Cập nhật cấu hình hệ thống thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    // ============================================================
    // GET USERS
    // GET /api/admin/users
    // ============================================================

    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<object>>> GetUsers()
    {
        try
        {
            var rawUsers = await _context.Users
                .AsNoTracking()
                .Include(u => u.Role)
                .ToListAsync();

            var users = rawUsers
                .Select(u =>
                {
                    var roleName =
                        (u.Role != null
                            ? u.Role.RoleName
                            : "Learner")
                        .ToLower();

                    string mappedRole = "student";

                    if (roleName.Contains("admin"))
                    {
                        mappedRole = "admin";
                    }
                    else if (
                        roleName.Contains("instructor") ||
                        roleName.Contains("giảng viên")
                    )
                    {
                        mappedRole = "instructor";
                    }

                    return new
                    {
                        id = u.UserId.ToString(),
                        name = u.FullName,
                        email = u.Email,

                        role = mappedRole,

                        status =
                            u.Status.ToLower() == "active"
                                ? "active"
                                : "locked",

                        avatar = u.AvatarUrl,

                        joinedDate =
                            u.CreatedAt.ToString("yyyy-MM-dd"),

                        lastActive =
                            u.LastLoginAt.HasValue
                                ? u.LastLoginAt.Value
                                    .ToString("yyyy-MM-dd HH:mm")
                                : "N/A",

                        coursesEnrolled =
                            _context.Enrollments.Count(
                                e =>
                                    e.LearnerId == u.UserId &&
                                    e.Status == "ACTIVE"
                            ),

                        coursesCreated =
                            _context.Courses.Count(
                                c =>
                                    c.InstructorId == u.UserId
                            )
                    };
                })
                .ToList();

            return Ok(
                ApiResponse<object>.SuccessResponse(
                    users,
                    "Retrieved user list successfully."
                )
            );
        }
        catch (Exception ex)
        {
            return StatusCode(
                500,
                ApiResponse<object>.FailureResponse(
                    ex.Message
                )
            );
        }
    }

    // ============================================================
    // UPDATE STATUS
    // PUT /api/admin/users/{id}/status
    // ============================================================

    [HttpPut("users/{id}/status")]
    public async Task<ActionResult<ApiResponse<object>>>
        UpdateUserStatus(
            int id,
            [FromBody] UpdateUserStatusRequest request)
    {
        var result =
            await _userService.UpdateUserStatusAsync(
                id,
                request.Status
            );

        if (!result.Success)
        {
            return result.Message == "User not found."
                ? NotFound(result)
                : BadRequest(result);
        }

        return Ok(result);
    }

    // ============================================================
    // UPDATE USER
    // PUT /api/admin/users/{id}
    // ============================================================

    [HttpPut("users/{id}")]
    public async Task<
        ActionResult<ApiResponse<AdminUserDto>>
    > UpdateUser(
        int id,
        [FromBody] AdminUpdateUserRequest request)
    {
        var result =
            await _userService.AdminUpdateUserAsync(
                id,
                request
            );

        if (!result.Success)
        {
            return result.Message == "User not found."
                ? NotFound(result)
                : BadRequest(result);
        }

        return Ok(result);
    }
}