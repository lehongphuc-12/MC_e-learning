// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Forum/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API.
// - Định tuyến: [Route("api/admin/forum")].
// - Trang trí bảo mật: [Authorize(Roles = "Admin")] (Chỉ tài khoản có quyền Quản trị viên mới được truy cập).
// - Vai trò: Cung cấp bộ API quản trị và kiểm duyệt diễn đàn MSEEK (Moderation API Suite): Xử lý báo cáo vi phạm,
//   ẩn/xóa/khôi phục bài viết và bình luận, và quản lý danh mục chủ đề thảo luận.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Bảo vệ an toàn nội dung cho cộng đồng MSEEK:
//   1. Tra cứu hàng đợi báo cáo vi phạm có phân trang và lọc theo trạng thái (PENDING, RESOLVED, DISMISSED) hoặc đối tượng (POST, COMMENT).
//   2. Duyệt/xử lý báo cáo (Resolve Report): Quyết định bác bỏ (DISMISS), ẩn nội dung (HIDE) hoặc xóa vĩnh viễn (DELETE).
//   3. Khôi phục bài viết / bình luận (Restore): Đưa bài viết/bình luận về trạng thái hoạt động và dọn dẹp các báo cáo cũ.
//   4. Cưỡng chế thay đổi trạng thái (Force Status Change): Cho phép Admin can thiệp trực tiếp trạng thái bài viết/bình luận.
//   5. Quản trị chủ đề (Topics CRUD): Tạo mới, sửa thông tin và xóa mềm chủ đề.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client (Admin Dashboard) -> Gửi HTTP Request kèm JWT Token (Role: Admin) tới AdminForumController.
// - Controller -> Trích xuất AdminId từ Claims -> Gọi sang IAdminForumService.
// - IAdminForumService -> Thực thi nghiệp vụ kiểm duyệt trên SmartMcDbContext -> Trả kết quả về Controller.
// - Controller bọc kết quả trong ApiResponse<T> -> Trả về Client với HTTP Status Code chuẩn (200, 400, 401, 404, 500).
// ====================================================================================================

using System;
using System.Security.Claims;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Forum.Controllers;

/// <summary>
/// API Controller dành riêng cho Quản trị viên để kiểm duyệt nội dung và quản lý diễn đàn MSEEK.
/// </summary>
[ApiController]
[Route("api/admin/forum")]
[Authorize(Roles = "Admin")]
public class AdminForumController : ControllerBase
{
    // [Giải phẫu Dependency Field]:
    // - private readonly IAdminForumService _adminForumService: Interface dịch vụ quản trị diễn đàn (Dependency Inversion Principle).
    private readonly IAdminForumService _adminForumService;

    /// <summary>
    /// Khởi tạo Controller với AdminForumService được inject từ DI Container.
    /// </summary>
    /// <param name="adminForumService">Dịch vụ quản trị và kiểm duyệt diễn đàn.</param>
    public AdminForumController(IAdminForumService adminForumService)
    {
        // [Dòng này làm gì]: Gán thể hiện Service vào biến nội bộ.
        _adminForumService = adminForumService;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm tiện ích (Private Helper) trích xuất ID của Quản trị viên từ JWT Token Claims.
    /// </summary>
    /// <returns>AdminId kiểu int hoặc null nếu token không hợp lệ.</returns>
    private int? GetCurrentAdminId()
    {
        // [Dòng này làm gì]: Đọc Claim NameIdentifier từ User (ClaimsPrincipal)
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        // Chuyển đổi an toàn sang số nguyên int
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/admin/forum/reports
    /// Lấy danh sách các đơn báo cáo vi phạm nội dung có phân trang và lọc theo tiêu chí.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Tiếp nhận các query params: page, limit, status (PENDING, RESOLVED...), targetType (POST, COMMENT).</para>
    /// <para>Bước 2: Gọi _adminForumService.GetReportsAsync(page, limit, status, targetType).</para>
    /// <para>Bước 3: Trả về HTTP 200 OK bọc PaginatedResult trong ApiResponse.</para>
    /// <para>Bước 4: Bắt ngoại lệ và trả về HTTP 500 nếu có lỗi ngoài ý muốn.</para>
    /// </summary>
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

    /// <summary>
    /// GET /api/admin/forum/posts
    /// Quản trị viên lấy danh sách toàn bộ bài viết (kể cả bài ẩn hoặc đã xóa) để kiểm duyệt.
    /// </summary>
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

    /// <summary>
    /// POST /api/admin/forum/reports/{id}/resolve
    /// Quản trị viên xử lý đơn báo cáo vi phạm theo hành động cụ thể (DISMISS, HIDE, DELETE).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất adminId từ JWT Token -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 2: Gọi _adminForumService.ResolveReportAsync(id, adminId.Value, action).</para>
    /// <para>Bước 3: Rẽ nhánh: Nếu !success -> Báo cáo không tồn tại, trả về 404 Not Found.</para>
    /// <para>Bước 4: Trả về HTTP 200 OK thông báo xử lý báo cáo thành công.</para>
    /// <para>Bước 5: Bắt ngoại lệ và trả về HTTP 500.</para>
    /// </summary>
    [HttpPost("reports/{id:int}/resolve")]
    public async Task<ActionResult<ApiResponse<bool>>> ResolveReport(int id, [FromQuery] string action = "DISMISS")
    {
        var adminId = GetCurrentAdminId();
        // Rẽ nhánh: Kiểm tra token Admin hợp lệ
        if (adminId is null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized."));

        try
        {
            var success = await _adminForumService.ResolveReportAsync(id, adminId.Value, action);
            // Rẽ nhánh: Báo cáo không tồn tại
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Báo cáo không tồn tại."));
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Xử lý báo cáo thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// POST /api/admin/forum/posts/{id}/restore
    /// Khôi phục bài viết đã bị ẩn/xóa về trạng thái PUBLISHED và dọn dẹp các báo cáo PENDING cũ.
    /// </summary>
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

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã khôi phục bài viết thành công. Báo cáo cũ đã được dọn dẹp."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// POST /api/admin/forum/posts/{id}/status
    /// Cưỡng chế cập nhật trạng thái của bài viết (PUBLISHED, HIDDEN_BY_ADMIN, DELETED).
    /// </summary>
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

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Cập nhật trạng thái bài viết thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// POST /api/admin/forum/comments/{id}/restore
    /// Khôi phục bình luận đã bị ẩn/xóa về trạng thái ACTIVE và dọn dẹp báo cáo vi phạm cũ.
    /// </summary>
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

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã khôi phục bình luận thành công. Báo cáo cũ đã được dọn dẹp."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// POST /api/admin/forum/comments/{id}/status
    /// Cưỡng chế cập nhật trạng thái của bình luận (ACTIVE, HIDDEN_BY_ADMIN, DELETED).
    /// </summary>
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

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Cập nhật trạng thái bình luận thành công."));
        }
        catch (Exception ex)
        {
            return StatusCode(500, ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// POST /api/admin/forum/topics
    /// Quản trị viên tạo mới một chủ đề thảo luận trên diễn đàn.
    /// </summary>
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

    /// <summary>
    /// PUT /api/admin/forum/topics/{id}
    /// Quản trị viên cập nhật thông tin chủ đề thảo luận theo ID.
    /// </summary>
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

    /// <summary>
    /// DELETE /api/admin/forum/topics/{id}
    /// Quản trị viên xóa mềm chủ đề thảo luận (chuyển trạng thái sang INACTIVE).
    /// </summary>
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
