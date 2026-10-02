using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Forum.Controllers;

[ApiController]
[Route("api/forum")]
public class ForumPostsController : ControllerBase
{
    private readonly IForumPostService _postService;
    private readonly IForumInteractionService _interactionService;
    private readonly ICloudinaryService _cloudinaryService;

    public ForumPostsController(
        IForumPostService postService,
        IForumInteractionService interactionService,
        ICloudinaryService cloudinaryService)
    {
        _postService = postService;
        _interactionService = interactionService;
        _cloudinaryService = cloudinaryService;
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

    // GET /api/forum/topics
    [HttpGet("topics")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<List<ForumTopicDto>>>> GetTopics()
    {
        try
        {
            var topics = await _postService.GetTopicsAsync();
            return Ok(ApiResponse<List<ForumTopicDto>>.SuccessResponse(topics, "Lấy danh sách chủ đề diễn đàn thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<List<ForumTopicDto>>.FailureResponse(ex.Message));
        }
    }

    // GET /api/forum/posts
    [HttpGet("posts")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<PaginatedResult<ForumPostDto>>>> GetPosts([FromQuery] PostQueryParameters query)
    {
        try
        {
            var userId = GetCurrentUserId();
            var isAdmin = IsAdmin();
            var result = await _postService.GetPostsAsync(query, userId, isAdmin);
            return Ok(ApiResponse<PaginatedResult<ForumPostDto>>.SuccessResponse(result, "Lấy danh sách bài viết thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<PaginatedResult<ForumPostDto>>.FailureResponse(ex.Message));
        }
    }

    // GET /api/forum/posts/{id}
    [HttpGet("posts/{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<ForumPostDto>>> GetPostById(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var isAdmin = IsAdmin();
            var post = await _postService.GetPostByIdAsync(id, userId, isAdmin);

            if (post is null)
            {
                return NotFound(ApiResponse<ForumPostDto>.FailureResponse("Bài viết không tồn tại hoặc đã bị ẩn."));
            }

            return Ok(ApiResponse<ForumPostDto>.SuccessResponse(post, "Lấy chi tiết bài viết thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumPostDto>.FailureResponse(ex.Message));
        }
    }

    private static string GetInnerExceptionMessage(Exception ex)
    {
        var current = ex;
        while (current.InnerException != null)
        {
            current = current.InnerException;
        }
        return current.Message;
    }

    // POST /api/forum/posts
    [HttpPost("posts")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumPostDto>>> CreatePost([FromBody] CreatePostRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<ForumPostDto>.FailureResponse("Vui lòng đăng nhập để tạo bài viết."));

        try
        {
            var post = await _postService.CreatePostAsync(userId.Value, request);
            return Ok(ApiResponse<ForumPostDto>.SuccessResponse(post, "Đăng bài viết mới thành công."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ForumPostDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumPostDto>.FailureResponse(GetInnerExceptionMessage(ex)));
        }
    }

    // PUT /api/forum/posts/{id}
    [HttpPut("posts/{id:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumPostDto>>> UpdatePost(int id, [FromBody] UpdatePostRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<ForumPostDto>.FailureResponse("Vui lòng đăng nhập."));

        try
        {
            var post = await _postService.UpdatePostAsync(id, userId.Value, request);
            if (post is null)
            {
                return NotFound(ApiResponse<ForumPostDto>.FailureResponse("Bài viết không tồn tại."));
            }

            return Ok(ApiResponse<ForumPostDto>.SuccessResponse(post, "Cập nhật bài viết thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<ForumPostDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ForumPostDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumPostDto>.FailureResponse(GetInnerExceptionMessage(ex)));
        }
    }

    // DELETE /api/forum/posts/{id}
    [HttpDelete("posts/{id:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> DeletePost(int id)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Vui lòng đăng nhập."));

        try
        {
            var isAdmin = IsAdmin();
            var success = await _postService.DeletePostAsync(id, userId.Value, isAdmin);
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Bài viết không tồn tại."));
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Xóa bài viết thành công."));
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

    // POST /api/forum/posts/{id}/react
    [HttpPost("posts/{id:int}/react")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumReactionSummaryDto>>> TogglePostReaction(int id, [FromBody] ToggleReactionRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<ForumReactionSummaryDto>.FailureResponse("Vui lòng đăng nhập."));

        request.TargetType = "POST";
        request.PostId = id;

        try
        {
            var result = await _interactionService.ToggleReactionAsync(userId.Value, request);
            return Ok(ApiResponse<ForumReactionSummaryDto>.SuccessResponse(result, "Cập nhật tương tác thành công."));
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

    // POST /api/forum/posts/{id}/report
    [HttpPost("posts/{id:int}/report")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> ReportPost(int id, [FromBody] CreateReportRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Vui lòng đăng nhập."));

        request.TargetType = "POST";
        request.PostId = id;

        try
        {
            var success = await _interactionService.CreateReportAsync(userId.Value, request);
            return Ok(ApiResponse<bool>.SuccessResponse(success, "Gửi báo cáo vi phạm bài viết thành công."));
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

    // POST /api/forum/upload-image
    [HttpPost("upload-image")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<string>>> UploadImage(IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(ApiResponse<string>.FailureResponse("Vui lòng chọn file hình ảnh hợp lệ."));
        }

        try
        {
            var result = await _cloudinaryService.UploadImageAsync(file, "forum_images");
            if (result.Error == null && (result.SecureUrl != null || result.Url != null))
            {
                var imageUrl = (result.SecureUrl ?? result.Url).ToString();
                return Ok(ApiResponse<string>.SuccessResponse(imageUrl, "Tải ảnh lên thành công."));
            }

            // Fallback to local storage if Cloudinary returns an error
            var localUrl = await SaveFileLocallyAsync(file);
            return Ok(ApiResponse<string>.SuccessResponse(localUrl, "Tải ảnh lên thành công."));
        }
        catch (Exception ex)
        {
            try
            {
                var localUrl = await SaveFileLocallyAsync(file);
                return Ok(ApiResponse<string>.SuccessResponse(localUrl, "Tải ảnh lên thành công."));
            }
            catch
            {
                return StatusCode(500, ApiResponse<string>.FailureResponse($"Tải ảnh thất bại: {ex.Message}"));
            }
        }
    }

    private async Task<string> SaveFileLocallyAsync(IFormFile file)
    {
        var uploadsFolder = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "uploads", "forum");
        if (!System.IO.Directory.Exists(uploadsFolder))
        {
            System.IO.Directory.CreateDirectory(uploadsFolder);
        }

        var fileName = $"{Guid.NewGuid()}_{System.IO.Path.GetFileName(file.FileName)}";
        var filePath = System.IO.Path.Combine(uploadsFolder, fileName);

        using (var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var req = HttpContext.Request;
        var baseUrl = $"{req.Scheme}://{req.Host}";
        return $"{baseUrl}/uploads/forum/{fileName}";
    }

    // GET /api/forum/users/{userId:int}/profile
    [HttpGet("users/{userId:int}/profile")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<ForumUserProfileDto>>> GetUserProfile(int userId)
    {
        try
        {
            var profile = await _postService.GetUserProfileAsync(userId);
            if (profile is null)
            {
                return NotFound(ApiResponse<ForumUserProfileDto>.FailureResponse("Người dùng không tồn tại."));
            }
            return Ok(ApiResponse<ForumUserProfileDto>.SuccessResponse(profile, "Lấy thông tin người dùng thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumUserProfileDto>.FailureResponse(ex.Message));
        }
    }
}
