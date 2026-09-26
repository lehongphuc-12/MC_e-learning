using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Forum.Controllers;

[ApiController]
[Route("api/forum")]
public class ForumCommentsController : ControllerBase
{
    private readonly IForumCommentService _commentService;
    private readonly IForumInteractionService _interactionService;

    public ForumCommentsController(IForumCommentService commentService, IForumInteractionService interactionService)
    {
        _commentService = commentService;
        _interactionService = interactionService;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    private bool IsAdmin()
    {
        return User.IsInRole("Admin");
    }

    // GET /api/forum/posts/{postId}/comments
    [HttpGet("posts/{postId:int}/comments")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<ForumCommentDto>>>> GetComments(int postId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var isAdmin = IsAdmin();
            var comments = await _commentService.GetCommentsByPostIdAsync(postId, userId, isAdmin);
            return Ok(ApiResponse<List<ForumCommentDto>>.SuccessResponse(comments, "Lấy danh sách bình luận thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<ForumCommentDto>>.FailureResponse(ex.Message));
        }
    }

    // POST /api/forum/comments
    [HttpPost("comments")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumCommentDto>>> AddComment([FromBody] CreateCommentRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<ForumCommentDto>.FailureResponse("Vui lòng đăng nhập để bình luận."));

        try
        {
            var comment = await _commentService.AddCommentAsync(userId.Value, request);
            return Ok(ApiResponse<ForumCommentDto>.SuccessResponse(comment, "Gửi bình luận thành công."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
    }

    // PUT /api/forum/comments/{id}
    [HttpPut("comments/{id:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumCommentDto>>> UpdateComment(int id, [FromBody] UpdateCommentRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<ForumCommentDto>.FailureResponse("Vui lòng đăng nhập."));

        try
        {
            var comment = await _commentService.UpdateCommentAsync(id, userId.Value, request);
            if (comment is null)
            {
                return NotFound(ApiResponse<ForumCommentDto>.FailureResponse("Bình luận không tồn tại."));
            }

            return Ok(ApiResponse<ForumCommentDto>.SuccessResponse(comment, "Cập nhật bình luận thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
    }

    // DELETE /api/forum/comments/{id}
    [HttpDelete("comments/{id:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteComment(int id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Vui lòng đăng nhập."));

        try
        {
            var isAdmin = IsAdmin();
            var success = await _commentService.DeleteCommentAsync(id, userId.Value, isAdmin);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Bình luận không tồn tại."));
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Xóa bình luận thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    // POST /api/forum/comments/{id}/react
    [HttpPost("comments/{id:int}/react")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumReactionSummaryDto>>> ToggleCommentReaction(int id, [FromBody] ToggleReactionRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<ForumReactionSummaryDto>.FailureResponse("Vui lòng đăng nhập."));

        request.TargetType = "COMMENT";
        request.CommentId = id;

        try
        {
            var result = await _interactionService.ToggleReactionAsync(userId.Value, request);
            return Ok(ApiResponse<ForumReactionSummaryDto>.SuccessResponse(result, "Cập nhật tương tác bình luận thành công."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ForumReactionSummaryDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumReactionSummaryDto>.FailureResponse(ex.Message));
        }
    }

    // POST /api/forum/comments/{id}/report
    [HttpPost("comments/{id:int}/report")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> ReportComment(int id, [FromBody] CreateReportRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Vui lòng đăng nhập."));

        request.TargetType = "COMMENT";
        request.CommentId = id;

        try
        {
            var success = await _interactionService.CreateReportAsync(userId.Value, request);
            return Ok(ApiResponse<bool>.SuccessResponse(success, "Gửi báo cáo vi phạm bình luận thành công."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }
}
