// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Forum/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API.
// - Định tuyến: [Route("api/forum")].
// - Vai trò: Tiếp nhận các yêu cầu tương tác chính của Diễn đàn: Quản lý danh mục chủ đề, duyệt danh sách bài viết,
//   đọc chi tiết bài viết, đăng bài mới, chỉnh sửa, xóa mềm, thả cảm xúc (Reaction), báo cáo vi phạm (Report),
//   tải lên hình ảnh minh họa (Cloudinary CDN kèm Local Storage Fallback), và xem hồ sơ thành viên diễn đàn.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Tạo trải nghiệm diễn đàn mở, tương tác cao và an toàn:
//   1. Cho phép xem danh sách chủ đề và đọc bài viết công khai không cần đăng nhập ([AllowAnonymous]).
//   2. Kiểm soát quyền chỉnh sửa/xóa bài viết nghiêm ngặt ([Authorize] và kiểm tra AuthorId/Role Admin).
//   3. Hỗ trợ cơ chế tải ảnh linh hoạt, chống gián đoạn dịch vụ (High Availability Upload Strategy):
//      Ưu tiên đẩy ảnh lên Cloudinary CDN; nếu Cloudinary gặp lỗi mạng hoặc hết hạn ngạch quota,
//      hệ thống tự động kích hoạt cơ chế dự phòng lưu ảnh vào thư mục máy chủ cục bộ (wwwroot/uploads/forum)
//      để học viên không bao giờ bị gián đoạn khi đăng bài.
//   4. Trích xuất thông điệp ngoại lệ gốc (GetInnerExceptionMessage) để thông báo lỗi rõ ràng cho Client khi gặp lỗi DB.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client -> Gửi Request tới ForumPostsController.
// - Controller -> Điều hướng tới IForumPostService, IForumInteractionService hoặc ICloudinaryService.
// - Service -> Thao tác dữ liệu trên SmartMcDbContext và Cloudinary CDN -> Trả kết quả về Controller.
// - Controller bọc trong ApiResponse<T> -> Trả về Client với HTTP Status Code tương ứng (200, 400, 401, 403, 404, 500).
// ====================================================================================================

using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Forum.Controllers;

/// <summary>
/// API Controller quản lý Bài viết, Chủ đề, Tải ảnh và Hồ sơ thành viên trên diễn đàn MSEEK.
/// </summary>
[ApiController]
[Route("api/forum")]
public class ForumPostsController : ControllerBase
{
    // [Giải phẫu Dependency Fields]:
    // - IForumPostService: Dịch vụ nghiệp vụ quản lý bài viết và chủ đề thảo luận.
    // - IForumInteractionService: Dịch vụ xử lý thả cảm xúc và gửi báo cáo vi phạm.
    // - ICloudinaryService: Dịch vụ lưu trữ và phân phối hình ảnh qua mạng CDN Cloudinary.
    private readonly IForumPostService _postService;
    private readonly IForumInteractionService _interactionService;
    private readonly ICloudinaryService _cloudinaryService;

    /// <summary>
    /// Khởi tạo Controller với các dependency được inject từ DI Container.
    /// </summary>
    /// <param name="postService">Service bài viết diễn đàn.</param>
    /// <param name="interactionService">Service tương tác và báo cáo vi phạm.</param>
    /// <param name="cloudinaryService">Service tải ảnh lên Cloudinary CDN.</param>
    public ForumPostsController(
        IForumPostService postService,
        IForumInteractionService interactionService,
        ICloudinaryService cloudinaryService)
    {
        // [Dòng này làm gì]: Gán các thể hiện Service vào các trường readonly nội bộ.
        _postService = postService;
        _interactionService = interactionService;
        _cloudinaryService = cloudinaryService;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm tiện ích trích xuất ID người dùng hiện tại từ JWT Token Claims.
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu chưa đăng nhập.</returns>
    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Kiểm tra xem người dùng hiện tại có mang vai trò Quản trị viên (Admin) hay không.
    /// </summary>
    private bool IsAdmin()
    {
        return User.IsInRole("Admin");
    }

    /// <summary>
    /// GET /api/forum/topics
    /// Lấy danh sách các chủ đề thảo luận đang hoạt động kèm số lượng bài viết.
    /// Cho phép truy cập công khai không cần đăng nhập ([AllowAnonymous]).
    /// </summary>
    /// <returns>ApiResponse chứa danh sách ForumTopicDto.</returns>
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

    /// <summary>
    /// GET /api/forum/posts
    /// Truy vấn danh sách bài viết có phân trang, tìm kiếm, lọc theo chủ đề và sắp xếp.
    /// Cho phép truy cập công khai ([AllowAnonymous]).
    /// </summary>
    /// <param name="query">Bộ tham số phân trang, tìm kiếm và sắp xếp.</param>
    /// <returns>ApiResponse chứa PaginatedResult của ForumPostDto.</returns>
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

    /// <summary>
    /// GET /api/forum/posts/{id}
    /// Xem chi tiết một bài viết theo ID và tự động tăng số lượt xem (ViewsCount).
    /// Cho phép truy cập công khai ([AllowAnonymous]).
    /// </summary>
    /// <param name="id">ID bài viết cần xem.</param>
    /// <returns>ApiResponse chứa ForumPostDto chi tiết hoặc 404 nếu không tìm thấy/bị ẩn.</returns>
    [HttpGet("posts/{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<ForumPostDto>>> GetPostById(int id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var isAdmin = IsAdmin();
            var post = await _postService.GetPostByIdAsync(id, userId, isAdmin);

            // Rẽ nhánh: Bài viết không tồn tại, đã bị xóa mềm hoặc đang bị ẩn mà người xem không có quyền
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

    /// <summary>
    /// Hàm tiện ích (Private Static Helper) đệ quy trích xuất thông điệp lỗi gốc (Root Cause InnerException)
    /// để trả về thông báo lỗi chính xác nhất cho Client thay vì thông báo chung chung.
    /// </summary>
    private static string GetInnerExceptionMessage(Exception ex)
    {
        var current = ex;
        while (current.InnerException != null)
        {
            current = current.InnerException;
        }
        return current.Message;
    }

    /// <summary>
    /// POST /api/forum/posts
    /// Đăng bài viết mới lên diễn đàn.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="request">Payload chứa TopicId, Title, Content, ImageUrl, IsAnonymous.</param>
    /// <returns>ApiResponse chứa ForumPostDto vừa tạo.</returns>
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
            // Bắt lỗi chủ đề không tồn tại -> HTTP 400 Bad Request
            return BadRequest(ApiResponse<ForumPostDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumPostDto>.FailureResponse(GetInnerExceptionMessage(ex)));
        }
    }

    /// <summary>
    /// PUT /api/forum/posts/{id}
    /// Tác giả chỉnh sửa nội dung bài viết đã đăng.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="id">ID bài viết cần sửa.</param>
    /// <param name="request">Payload cập nhật bài viết.</param>
    /// <returns>ApiResponse chứa ForumPostDto sau khi sửa.</returns>
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
            // Bắt lỗi cố tình sửa bài của người khác -> HTTP 403 Forbidden
            return StatusCode(403, ApiResponse<ForumPostDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            // Bắt lỗi bài viết đang bị tạm ẩn -> HTTP 400 Bad Request
            return BadRequest(ApiResponse<ForumPostDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumPostDto>.FailureResponse(GetInnerExceptionMessage(ex)));
        }
    }

    /// <summary>
    /// DELETE /api/forum/posts/{id}
    /// Xóa mềm bài viết khỏi diễn đàn (Tác giả hoặc Admin).
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="id">ID bài viết cần xóa.</param>
    /// <returns>ApiResponse chứa cờ bool thành công.</returns>
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

    /// <summary>
    /// POST /api/forum/posts/{id}/react
    /// Thả, chuyển đổi hoặc hủy cảm xúc (Reaction) trên một bài viết.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="id">ID bài viết được thả cảm xúc.</param>
    /// <param name="request">Payload chứa ReactionType (LIKE, LOVE, HELPFUL).</param>
    /// <returns>ApiResponse chứa ForumReactionSummaryDto.</returns>
    [HttpPost("posts/{id:int}/react")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumReactionSummaryDto>>> TogglePostReaction(int id, [FromBody] ToggleReactionRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<ForumReactionSummaryDto>.FailureResponse("Vui lòng đăng nhập."));

        // [BẢO MẬT]: Cưỡng chế TargetType = POST và PostId = id từ Route URL
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

    /// <summary>
    /// POST /api/forum/posts/{id}/report
    /// Người dùng gửi báo cáo vi phạm đối với một bài viết.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="id">ID bài viết bị báo cáo.</param>
    /// <param name="request">Payload chứa Reason và Details.</param>
    /// <returns>ApiResponse chứa cờ bool báo cáo thành công.</returns>
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

    /// <summary>
    /// POST /api/forum/upload-image
    /// Tải lên ảnh minh họa cho bài viết hoặc bình luận diễn đàn.
    /// Cơ chế dự phòng thông minh (Fallback Strategy): Ưu tiên Cloudinary CDN; nếu lỗi sẽ fallback lưu cục bộ trên máy chủ.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="file">File hình ảnh gửi từ Client dạng Multipart form.</param>
    /// <returns>ApiResponse chứa URL ảnh đã tải lên.</returns>
    [HttpPost("upload-image")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<string>>> UploadImage(IFormFile file)
    {
        // [BƯỚC 1]: Kiểm tra tính hợp lệ của file gửi lên
        if (file is null || file.Length == 0)
        {
            return BadRequest(ApiResponse<string>.FailureResponse("Vui lòng chọn file hình ảnh hợp lệ."));
        }

        try
        {
            // [BƯỚC 2]: Ưu tiên đẩy ảnh lên Cloudinary CDN
            var result = await _cloudinaryService.UploadImageAsync(file, "forum_images");
            if (result.Error == null && (result.SecureUrl != null || result.Url != null))
            {
                var imageUrl = (result.SecureUrl ?? result.Url).ToString();
                return Ok(ApiResponse<string>.SuccessResponse(imageUrl, "Tải ảnh lên thành công."));
            }

            // [BƯỚC 3]: Kích hoạt Fallback lưu cục bộ nếu Cloudinary trả về lỗi nghiệp vụ
            var localUrl = await SaveFileLocallyAsync(file);
            return Ok(ApiResponse<string>.SuccessResponse(localUrl, "Tải ảnh lên thành công."));
        }
        catch (Exception ex)
        {
            // [BƯỚC 4]: Kích hoạt Fallback lưu cục bộ nếu Cloudinary văng Exception mạng
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

    /// <summary>
    /// Hàm tiện ích (Private Helper) lưu file ảnh vào thư mục máy chủ cục bộ (wwwroot/uploads/forum).
    /// </summary>
    private async Task<string> SaveFileLocallyAsync(IFormFile file)
    {
        // Xác định đường dẫn thư mục lưu trữ cục bộ
        var uploadsFolder = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "uploads", "forum");
        if (!System.IO.Directory.Exists(uploadsFolder))
        {
            System.IO.Directory.CreateDirectory(uploadsFolder);
        }

        // Tạo tên file duy nhất kết hợp GUID để chống trùng lặp tên file
        var fileName = $"{Guid.NewGuid()}_{System.IO.Path.GetFileName(file.FileName)}";
        var filePath = System.IO.Path.Combine(uploadsFolder, fileName);

        // Lưu stream file xuống đĩa cứng
        using (var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Tạo đường dẫn URL tuyệt đối trả về Client
        var req = HttpContext.Request;
        var baseUrl = $"{req.Scheme}://{req.Host}";
        return $"{baseUrl}/uploads/forum/{fileName}";
    }

    /// <summary>
    /// GET /api/forum/users/{userId:int}/profile
    /// Lấy hồ sơ hoạt động đóng góp của thành viên diễn đàn (số lượng bài viết và bình luận).
    /// Cho phép xem công khai ([AllowAnonymous]).
    /// </summary>
    /// <param name="userId">ID người dùng cần tra cứu.</param>
    /// <returns>ApiResponse chứa ForumUserProfileDto.</returns>
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
