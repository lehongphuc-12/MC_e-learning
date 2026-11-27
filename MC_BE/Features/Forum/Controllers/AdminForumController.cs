using System;
using System.Security.Claims;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using MC_BE.Features.Admin.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Forum.Controllers;

[ApiController]
[Route("api/admin/forum")]
[Authorize(Roles = "Admin")]
public class AdminForumController : ControllerBase
{
    private readonly IAdminForumService _adminForumService;

    private readonly AdminActivityLogger _activityLogger;

    public AdminForumController(IAdminForumService adminForumService, AdminActivityLogger activityLogger)
    {
        _adminForumService = adminForumService;
        _activityLogger = activityLogger;
    }

    private int? GetCurrentAdminId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    [HttpGet("reports")]
    public async Task<ActionResult<ApiResponse<PaginatedResult<ForumReportDto>>>> GetReports(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? targetType = null)
    {
        try
        {
            var reports = await _adminForumService.GetReportsAsync(page, limit, status, targetType);
            return Ok(ApiResponse<PaginatedResult<ForumReportDto>>.SuccessResponse(reports, "Lấy danh sách báo cáo vi phạm thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<PaginatedResult<ForumReportDto>>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("posts")]
    public async Task<ActionResult<ApiResponse<PaginatedResult<ForumPostDto>>>> GetPosts(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] int? topicId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        try
        {
            var posts = await _adminForumService.GetAdminPostsAsync(page, limit, topicId, status, search);
            return Ok(ApiResponse<PaginatedResult<ForumPostDto>>.SuccessResponse(posts, "Lấy danh sách bài viết thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<PaginatedResult<ForumPostDto>>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("reports/{id:int}/resolve")]
    public async Task<ActionResult<ApiResponse<bool>>> ResolveReport(int id, [FromQuery] string action = "DISMISS")
    {
        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized."));

        try
        {
            var success = await _adminForumService.ResolveReportAsync(id, adminId.Value, action);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Báo cáo không tồn tại."));
            }

            await _activityLogger.RecordAsync(adminId.Value, "FORUM_REPORT_RESOLVED", "FORUM_REPORT", id.ToString(), $"Xử lý báo cáo diễn đàn bằng hành động {action}.", HttpContext.TraceIdentifier);

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Xử lý báo cáo thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("posts/{id:int}/restore")]
    public async Task<ActionResult<ApiResponse<bool>>> RestorePost(int id)
    {
        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized."));

        try
        {
            var success = await _adminForumService.RestorePostAsync(id, adminId.Value);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Bài viết không tồn tại."));
            }

            await _activityLogger.RecordAsync(adminId.Value, "FORUM_POST_RESTORED", "FORUM_POST", id.ToString(), $"Khôi phục bài viết diễn đàn #{id}.", HttpContext.TraceIdentifier);

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã khôi phục bài viết thành công. Báo cáo cũ đã được dọn dẹp."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("posts/{id:int}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdatePostStatus(int id, [FromBody] UpdateItemStatusRequest request)
    {
        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized."));

        try
        {
            var success = await _adminForumService.UpdatePostStatusAsync(id, adminId.Value, request.Status);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Bài viết không tồn tại."));
            }

            await _activityLogger.RecordAsync(adminId.Value, "FORUM_POST_STATUS_UPDATED", "FORUM_POST", id.ToString(), $"Cập nhật trạng thái bài viết diễn đàn #{id} thành {request.Status}.", HttpContext.TraceIdentifier);

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Cập nhật trạng thái bài viết thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("comments/{id:int}/restore")]
    public async Task<ActionResult<ApiResponse<bool>>> RestoreComment(int id)
    {
        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized."));

        try
        {
            var success = await _adminForumService.RestoreCommentAsync(id, adminId.Value);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Bình luận không tồn tại."));
            }

            await _activityLogger.RecordAsync(adminId.Value, "FORUM_COMMENT_RESTORED", "FORUM_COMMENT", id.ToString(), $"Khôi phục bình luận diễn đàn #{id}.", HttpContext.TraceIdentifier);

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã khôi phục bình luận thành công. Báo cáo cũ đã được dọn dẹp."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("comments/{id:int}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateCommentStatus(int id, [FromBody] UpdateItemStatusRequest request)
    {
        var adminId = GetCurrentAdminId();
        if (adminId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized."));

        try
        {
            var success = await _adminForumService.UpdateCommentStatusAsync(id, adminId.Value, request.Status);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Bình luận không tồn tại."));
            }

            await _activityLogger.RecordAsync(adminId.Value, "FORUM_COMMENT_STATUS_UPDATED", "FORUM_COMMENT", id.ToString(), $"Cập nhật trạng thái bình luận diễn đàn #{id} thành {request.Status}.", HttpContext.TraceIdentifier);

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Cập nhật trạng thái bình luận thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("topics")]
    public async Task<ActionResult<ApiResponse<ForumTopicDto>>> CreateTopic([FromBody] CreateForumTopicDto request)
    {
        try
        {
            var topic = await _adminForumService.CreateTopicAsync(request);
            return Ok(ApiResponse<ForumTopicDto>.SuccessResponse(topic, "Tạo chủ đề mới thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumTopicDto>.FailureResponse(ex.Message));
        }
    }

    [HttpPut("topics/{id:int}")]
    public async Task<ActionResult<ApiResponse<ForumTopicDto>>> UpdateTopic(int id, [FromBody] CreateForumTopicDto request)
    {
        try
        {
            var topic = await _adminForumService.UpdateTopicAsync(id, request);
            if (topic is null)
            {
                return NotFound(ApiResponse<ForumTopicDto>.FailureResponse("Chủ đề không tồn tại."));
            }

            return Ok(ApiResponse<ForumTopicDto>.SuccessResponse(topic, "Cập nhật chủ đề thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumTopicDto>.FailureResponse(ex.Message));
        }
    }

    [HttpDelete("topics/{id:int}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteTopic(int id)
    {
        try
        {
            var success = await _adminForumService.DeleteTopicAsync(id);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Chủ đề không tồn tại."));
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Xóa chủ đề thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }
}
