// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Forum/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API.
// - Định tuyến: [Route("api/forum")].
// - Vai trò: Tiếp nhận và điều hướng toàn bộ các yêu cầu HTTP liên quan đến Bình luận (Comments) và Tương tác trên bình luận:
//   Xem cây bình luận lồng nhau, gửi bình luận mới, chỉnh sửa, xóa, thả cảm xúc (Reaction) và báo cáo vi phạm (Report).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Tạo luồng thảo luận mượt mà và tương tác hai chiều cho học viên:
//   1. Cho phép xem bình luận công khai không cần đăng nhập ([AllowAnonymous] tại GET comments).
//   2. Ép buộc xác thực danh tính ([Authorize]) khi thực hiện các hành động có tác động dữ liệu (Viết, Sửa, Xóa, Thả cảm xúc, Báo cáo).
//   3. Bảo vệ toàn vẹn tham số: Cưỡng chế gán TargetType = "COMMENT" và CommentId = id từ Route URL trên các API React/Report
//      để ngăn chặn Client gửi nhầm hoặc cố tình giả mạo ID bài viết trong body payload.
//   4. Phân loại mã lỗi HTTP chuẩn hóa (200 OK, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client -> Gửi Request tới ForumCommentsController.
// - Controller -> Trích xuất UserId / IsAdmin từ Claims -> Gọi sang IForumCommentService hoặc IForumInteractionService.
// - Services -> Xử lý dữ liệu và cây phân cấp trên SmartMcDbContext -> Trả kết quả về Controller.
// - Controller bọc trong ApiResponse<T> -> Trả về Client.
// ====================================================================================================

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

/// <summary>
/// API Controller quản lý các hoạt động bình luận và tương tác xã hội trên bình luận của diễn đàn MSEEK.
/// </summary>
[ApiController]
[Route("api/forum")]
public class ForumCommentsController : ControllerBase
{
    // [Giải phẫu Dependency Fields]:
    // - private readonly IForumCommentService _commentService: Dịch vụ nghiệp vụ bình luận và dựng cây phân cấp.
    // - private readonly IForumInteractionService _interactionService: Dịch vụ xử lý thả cảm xúc và báo cáo vi phạm.
    private readonly IForumCommentService _commentService;
    private readonly IForumInteractionService _interactionService;

    /// <summary>
    /// Khởi tạo Controller với các dịch vụ được inject từ DI Container.
    /// </summary>
    /// <param name="commentService">Service xử lý bình luận.</param>
    /// <param name="interactionService">Service xử lý tương tác và báo cáo.</param>
    public ForumCommentsController(IForumCommentService commentService, IForumInteractionService interactionService)
    {
        // [Dòng này làm gì]: Gán các thể hiện Service vào biến nội bộ.
        _commentService = commentService;
        _interactionService = interactionService;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm tiện ích trích xuất ID người dùng hiện tại từ JWT Token Claims.
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu chưa đăng nhập hoặc token sai.</returns>
    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm tiện ích kiểm tra xem người dùng hiện tại có vai trò Quản trị viên (Admin) hay không.
    /// </summary>
    /// <returns>True nếu có role Admin, False nếu không.</returns>
    private bool IsAdmin()
    {
        return User.IsInRole("Admin");
    }

    /// <summary>
    /// GET /api/forum/posts/{postId}/comments
    /// Lấy toàn bộ danh sách bình luận của bài viết được tổ chức thành cấu trúc cây 2 cấp (Replies).
    /// Cho phép khách vãng lai xem công khai không cần đăng nhập ([AllowAnonymous]).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Lấy userId và quyền isAdmin từ HttpContext.User (nếu có).</para>
    /// <para>Bước 2: Gọi _commentService.GetCommentsByPostIdAsync(postId, userId, isAdmin).</para>
    /// <para>Bước 3: Trả về HTTP 200 OK bọc danh sách ForumCommentDto trong ApiResponse.</para>
    /// <para>Bước 4: Bắt ngoại lệ và trả về HTTP 500 nếu gặp sự cố.</para>
    /// </summary>
    /// <param name="postId">ID của bài viết cần tải bình luận.</param>
    /// <returns>ApiResponse chứa danh sách bình luận dạng cây.</returns>
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

    /// <summary>
    /// POST /api/forum/comments
    /// Thành viên gửi bình luận mới cho bài viết hoặc trả lời bình luận của người khác.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất userId từ JWT Claims -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 2: Gọi _commentService.AddCommentAsync(userId.Value, request).</para>
    /// <para>Bước 3: Trả về HTTP 200 OK kèm ForumCommentDto vừa tạo.</para>
    /// <para>Bước 4: Bắt InvalidOperationException (bài viết bị khóa/ẩn/xóa hoặc bình luận cha không tồn tại) -> Trả về 400 Bad Request.</para>
    /// <para>Bước 5: Bắt ngoại lệ ngoài ý muốn -> Trả về HTTP 500.</para>
    /// </summary>
    /// <param name="request">Payload chứa PostId, ParentCommentId, Content, ImageUrl, IsAnonymous.</param>
    /// <returns>ApiResponse chứa thông tin bình luận vừa tạo.</returns>
    [HttpPost("comments")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumCommentDto>>> AddComment([FromBody] CreateCommentRequest request)
    {
        var userId = GetCurrentUserId();
        // Rẽ nhánh: Kiểm tra xác thực đăng nhập
        if (userId is null)
            return Unauthorized(ApiResponse<ForumCommentDto>.FailureResponse("Vui lòng đăng nhập để bình luận."));

        try
        {
            var comment = await _commentService.AddCommentAsync(userId.Value, request);
            return Ok(ApiResponse<ForumCommentDto>.SuccessResponse(comment, "Gửi bình luận thành công."));
        }
        catch (InvalidOperationException ex)
        {
            // Bắt lỗi vi phạm nghiệp vụ (bài viết bị khóa, bị ẩn hoặc cha không hợp lệ) -> HTTP 400
            return BadRequest(ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// PUT /api/forum/comments/{id}
    /// Tác giả chỉnh sửa nội dung bình luận đã đăng.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="id">ID bình luận cần sửa.</param>
    /// <param name="request">Payload chứa nội dung mới.</param>
    /// <returns>ApiResponse chứa ForumCommentDto đã cập nhật.</returns>
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
            // Rẽ nhánh: Không tìm thấy bình luận hoặc đã bị xóa
            if (comment is null)
            {
                return NotFound(ApiResponse<ForumCommentDto>.FailureResponse("Bình luận không tồn tại."));
            }

            return Ok(ApiResponse<ForumCommentDto>.SuccessResponse(comment, "Cập nhật bình luận thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            // Bắt lỗi cố tình sửa bình luận của người khác -> HTTP 403 Forbidden
            return StatusCode(403, ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            // Bắt lỗi sửa bình luận đang bị ẩn kiểm duyệt -> HTTP 400 Bad Request
            return BadRequest(ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<ForumCommentDto>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// DELETE /api/forum/comments/{id}
    /// Xóa mềm bình luận khỏi diễn đàn (Tác giả hoặc Admin).
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="id">ID bình luận cần xóa.</param>
    /// <returns>ApiResponse chứa cờ bool thành công.</returns>
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
            // Không có quyền xóa bình luận của người khác -> HTTP 403 Forbidden
            return StatusCode(403, ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// POST /api/forum/comments/{id}/react
    /// Thả, đổi loại hoặc hủy cảm xúc (LIKE, LOVE, HELPFUL) trên một bình luận cụ thể.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="id">ID của bình luận được thả cảm xúc.</param>
    /// <param name="request">Payload chứa ReactionType.</param>
    /// <returns>ApiResponse chứa ForumReactionSummaryDto.</returns>
    [HttpPost("comments/{id:int}/react")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ForumReactionSummaryDto>>> ToggleCommentReaction(int id, [FromBody] ToggleReactionRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<ForumReactionSummaryDto>.FailureResponse("Vui lòng đăng nhập."));

        // [BẢO MẬT & TOÀN VẸN DỮ LIỆU]: Cưỡng chế gán TargetType = COMMENT và CommentId = id từ Route URL
        // Ngăn ngừa Client gửi payload sai lệch hoặc cố tình giả mạo PostId
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

    /// <summary>
    /// POST /api/forum/comments/{id}/report
    /// Người dùng gửi báo cáo vi phạm đối với một bình luận.
    /// Yêu cầu đăng nhập ([Authorize]).
    /// </summary>
    /// <param name="id">ID bình luận bị báo cáo.</param>
    /// <param name="request">Payload chứa Reason và Details.</param>
    /// <returns>ApiResponse chứa cờ bool báo cáo thành công.</returns>
    [HttpPost("comments/{id:int}/report")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> ReportComment(int id, [FromBody] CreateReportRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Vui lòng đăng nhập."));

        // Cưỡng chế đồng bộ đối tượng mục tiêu từ URL Route
        request.TargetType = "COMMENT";
        request.CommentId = id;

        try
        {
            var success = await _interactionService.CreateReportAsync(userId.Value, request);
            return Ok(ApiResponse<bool>.SuccessResponse(success, "Gửi báo cáo vi phạm bình luận thành công."));
        }
        catch (InvalidOperationException ex)
        {
            // Bắt các quy chế: tự báo cáo, báo cáo trùng lặp hoặc bình luận đang ẩn -> HTTP 400 Bad Request
            return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }
}
