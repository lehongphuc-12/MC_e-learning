using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api/course-favorites")]
[Authorize(Roles = "Learner")]
public sealed class CourseFavoritesController : ControllerBase
{
    private readonly ICourseFavoriteService _favorites;

    public CourseFavoritesController(ICourseFavoriteService favorites) => _favorites = favorites;

    private int? CurrentLearnerId
    {
        get
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<int>>>> GetMine()
    {
        if (CurrentLearnerId is not int learnerId) return Unauthorized(ApiResponse<List<int>>.FailureResponse("Không xác định được tài khoản học viên."));
        var ids = await _favorites.GetFavoriteCourseIdsAsync(learnerId);
        return Ok(ApiResponse<List<int>>.SuccessResponse(ids));
    }

    [HttpPost("{courseId:int}")]
    public async Task<ActionResult<ApiResponse<string>>> Add(int courseId)
    {
        if (CurrentLearnerId is not int learnerId) return Unauthorized(ApiResponse<string>.FailureResponse("Không xác định được tài khoản học viên."));
        try
        {
            await _favorites.AddFavoriteAsync(learnerId, courseId);
            return Ok(ApiResponse<string>.SuccessResponse("OK", "Đã thêm khóa học vào danh sách yêu thích."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<string>.FailureResponse(ex.Message));
        }
    }

    [HttpDelete("{courseId:int}")]
    public async Task<ActionResult<ApiResponse<string>>> Remove(int courseId)
    {
        if (CurrentLearnerId is not int learnerId) return Unauthorized(ApiResponse<string>.FailureResponse("Không xác định được tài khoản học viên."));
        await _favorites.RemoveFavoriteAsync(learnerId, courseId);
        return Ok(ApiResponse<string>.SuccessResponse("OK", "Đã xóa khóa học khỏi danh sách yêu thích."));
    }
}
