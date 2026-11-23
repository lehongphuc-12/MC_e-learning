using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MC_BE.Core.DTOs;
using MC_BE.Features.Users.DTOs;
using MC_BE.Features.Users.Services.Interfaces;

namespace MC_BE.Features.Users.Controllers;

[ApiController]
[Route("api/user-preferences")]
[Authorize]
public class UserPreferencesController : ControllerBase
{
    private readonly IUserPreferenceService _userPreferenceService;

    public UserPreferencesController(IUserPreferenceService userPreferenceService)
    {
        _userPreferenceService = userPreferenceService;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/user-preferences/me
    /// Trả về thông tin khảo sát định hướng đầu vào hiện tại của học viên (nếu chưa có thì IsCompleted = false).
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserPreferenceDto>>> GetMyPreferences()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<UserPreferenceDto>.FailureResponse("Không xác định được danh tính người dùng."));

        var pref = await _userPreferenceService.GetUserPreferenceAsync(userId.Value);
        return Ok(ApiResponse<UserPreferenceDto>.SuccessResponse(pref, "Lấy thông tin khảo sát thành công."));
    }

    /// <summary>
    /// POST /api/user-preferences
    /// Lưu hoặc cập nhật khảo sát định hướng đầu vào của học viên với IsCompleted = true.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserPreferenceDto>>> SavePreferences([FromBody] SaveUserPreferenceRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<UserPreferenceDto>.FailureResponse("Không xác định được danh tính người dùng."));

        if (request is null)
            return BadRequest(ApiResponse<UserPreferenceDto>.FailureResponse("Dữ liệu khảo sát không hợp lệ."));

        var updated = await _userPreferenceService.SaveUserPreferenceAsync(userId.Value, request);
        return Ok(ApiResponse<UserPreferenceDto>.SuccessResponse(updated, "Lưu thông tin khảo sát định hướng thành công."));
    }

    /// <summary>
    /// GET /api/user-preferences/recommendations
    /// Trả về danh sách khóa học đề xuất thông minh dựa trên thông tin khảo sát hoặc dữ liệu học tập.
    /// </summary>
    [HttpGet("recommendations")]
    public async Task<ActionResult<ApiResponse<MC_BE.Features.Courses.DTOs.CourseRecommendationResponse>>> GetRecommendations(
        [FromServices] MC_BE.Features.Courses.Services.Interfaces.ICourseRecommendationService recommendationService,
        [FromQuery] int limit = 10)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<MC_BE.Features.Courses.DTOs.CourseRecommendationResponse>.FailureResponse("Không xác định được danh tính người dùng."));

        var result = await recommendationService.GetRecommendationsAsync(userId.Value, limit);
        return Ok(ApiResponse<MC_BE.Features.Courses.DTOs.CourseRecommendationResponse>.SuccessResponse(result, "Lấy danh sách khóa học đề xuất thành công."));
    }
}
