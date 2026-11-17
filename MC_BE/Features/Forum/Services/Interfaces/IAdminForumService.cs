// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Abstraction (Interface) trong Application Core / Business Logic Layer.
// - Nằm trong module: Features/Forum/Services/Interfaces.
// - Vai trò: Định nghĩa hợp đồng nghiệp vụ (Contract) cho các thao tác Quản trị diễn đàn (Admin Forum Management).
// - Nguyên lý: Áp dụng Dependency Inversion Principle (DIP) trong SOLID; tầng Controller (AdminForumController)
//   chỉ phụ thuộc vào Interface này chứ không phụ thuộc vào lớp triển khai cụ thể (AdminForumService).
//   Cho phép dễ dàng thay thế logic hoặc Mocking khi viết Unit Test.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cung cấp bộ công cụ kiểm duyệt nội dung và vận hành diễn đàn dành riêng cho Quản trị viên (Admin):
//   1. Tra cứu danh sách đơn báo cáo vi phạm (Reports) với bộ lọc trạng thái và phân trang.
//   2. Tra cứu toàn bộ bài viết (kể cả bài bị ẩn hoặc đã xóa) để quản trị và kiểm duyệt.
//   3. Xử lý đơn báo cáo vi phạm (Resolve Report): Bác bỏ (DISMISS), Ẩn bài viết/bình luận (HIDE), hoặc Xóa (DELETE).
//   4. Khôi phục hoặc cưỡng chế cập nhật trạng thái của Bài viết và Bình luận.
//   5. Quản lý danh mục chủ đề thảo luận (Forum Topic): Thêm mới, cập nhật, xóa chủ đề.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: AdminForumController inject IAdminForumService.
// - Triển khai: AdminForumService kế thừa và cài đặt toàn bộ các phương thức trong interface này.
// - CSDL: Thao tác trực tiếp với các bảng ForumReports, ForumPosts, ForumComments, ForumTopics thông qua SmartMcDbContext.
// ====================================================================================================

using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;

namespace MC_BE.Features.Forum.Services.Interfaces;

/// <summary>
/// Giao diện định nghĩa các dịch vụ quản trị và kiểm duyệt diễn đàn dành cho Administrator.
/// </summary>
public interface IAdminForumService
{
    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách các đơn báo cáo vi phạm nội dung trên diễn đàn có phân trang và lọc theo trạng thái/đối tượng.
    /// <para>End-to-End Flow: Admin gọi API -> Controller đọc params -> Service truy vấn ForumReports có lọc theo status và targetType -> Trả về PaginatedResult.</para>
    /// </summary>
    /// <param name="page">Số trang hiện tại (bắt đầu từ 1).</param>
    /// <param name="limit">Số lượng bản ghi trên một trang.</param>
    /// <param name="status">Trạng thái báo cáo cần lọc (PENDING, RESOLVED, DISMISSED hoặc null nếu lấy tất cả).</param>
    /// <param name="targetType">Loại đối tượng vi phạm (POST, COMMENT hoặc null nếu lấy tất cả).</param>
    /// <returns>Đối tượng phân trang PaginatedResult chứa danh sách ForumReportDto và thông số phân trang.</returns>
    Task<PaginatedResult<ForumReportDto>> GetReportsAsync(int page, int limit, string? status, string? targetType);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách bài viết trên diễn đàn phục vụ màn hình quản trị của Admin (xem được cả bài PUBLISHED, HIDDEN_BY_ADMIN, DELETED).
    /// </summary>
    /// <param name="page">Số trang.</param>
    /// <param name="limit">Số lượng bài trên mỗi trang.</param>
    /// <param name="topicId">Lọc theo chủ đề cụ thể (null để lấy tất cả).</param>
    /// <param name="status">Lọc theo trạng thái bài viết (PUBLISHED, HIDDEN_BY_ADMIN, DELETED hoặc null).</param>
    /// <param name="search">Từ khóa tìm kiếm theo tiêu đề hoặc nội dung.</param>
    /// <returns>Danh sách bài viết phân trang PaginatedResult chứa ForumPostDto.</returns>
    Task<PaginatedResult<ForumPostDto>> GetAdminPostsAsync(int page, int limit, int? topicId, string? status, string? search);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Quản trị viên xử lý một đơn báo cáo vi phạm cụ thể theo hành động tương ứng (DISMISS, HIDE, DELETE).
    /// <para>Quy tắc hành động:</para>
    /// <para>- "DISMISS": Bác bỏ báo cáo (coi như nội dung hợp lệ), trạng thái báo cáo chuyển thành DISMISSED.</para>
    /// <para>- "HIDE": Xác nhận vi phạm nhưng chưa xóa vĩnh viễn, ẩn nội dung khỏi cộng đồng (trạng thái HIDDEN_BY_ADMIN).</para>
    /// <para>- "DELETE": Xóa nội dung (trạng thái DELETED).</para>
    /// </summary>
    /// <param name="reportId">ID của bản ghi báo cáo cần xử lý.</param>
    /// <param name="adminId">ID của Quản trị viên thực hiện xử lý (ghi nhận audit log ResolvedById).</param>
    /// <param name="action">Hành động kiểm duyệt ("DISMISS", "HIDE", "DELETE").</param>
    /// <returns>True nếu xử lý thành công, False nếu không tìm thấy bản ghi báo cáo.</returns>
    Task<bool> ResolveReportAsync(int reportId, int adminId, string action); // action: DISMISS, HIDE, DELETE

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Khôi phục bài viết đã bị ẩn hoặc xóa về trạng thái công khai bình thường (PUBLISHED).
    /// </summary>
    /// <param name="postId">ID của bài viết cần khôi phục.</param>
    /// <param name="adminId">ID của Quản trị viên thực hiện khôi phục.</param>
    /// <returns>True nếu khôi phục thành công, False nếu bài viết không tồn tại.</returns>
    Task<bool> RestorePostAsync(int postId, int adminId);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cưỡng chế cập nhật trạng thái kiểm duyệt của bài viết (PUBLISHED, HIDDEN_BY_ADMIN, DELETED).
    /// </summary>
    /// <param name="postId">ID của bài viết.</param>
    /// <param name="adminId">ID Admin thực hiện.</param>
    /// <param name="status">Trạng thái mới.</param>
    /// <returns>True nếu cập nhật thành công, False nếu bài viết không tồn tại.</returns>
    Task<bool> UpdatePostStatusAsync(int postId, int adminId, string status);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Khôi phục bình luận đã bị ẩn hoặc xóa về trạng thái hoạt động bình thường (ACTIVE).
    /// </summary>
    /// <param name="commentId">ID của bình luận cần khôi phục.</param>
    /// <param name="adminId">ID Admin thực hiện.</param>
    /// <returns>True nếu thành công, False nếu bình luận không tồn tại.</returns>
    Task<bool> RestoreCommentAsync(int commentId, int adminId);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cập nhật trạng thái kiểm duyệt của một bình luận (ACTIVE, HIDDEN_BY_ADMIN, DELETED).
    /// </summary>
    /// <param name="commentId">ID của bình luận.</param>
    /// <param name="adminId">ID Admin thực hiện.</param>
    /// <param name="status">Trạng thái kiểm duyệt mới.</param>
    /// <returns>True nếu cập nhật thành công, False nếu không tìm thấy bình luận.</returns>
    Task<bool> UpdateCommentStatusAsync(int commentId, int adminId, string status);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Tạo mới một chủ đề thảo luận trên diễn đàn kèm kiểm tra tính duy nhất của tên và URL slug.
    /// </summary>
    /// <param name="request">Dữ liệu tạo chủ đề (Tên, Slug, Mô tả, Icon, OrderIndex).</param>
    /// <returns>Thông tin chủ đề vừa tạo dưới dạng ForumTopicDto.</returns>
    Task<ForumTopicDto> CreateTopicAsync(CreateForumTopicDto request);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cập nhật thông tin chủ đề thảo luận (tên, slug, icon, thứ tự hiển thị).
    /// </summary>
    /// <param name="topicId">ID chủ đề cần chỉnh sửa.</param>
    /// <param name="request">Dữ liệu cập nhật mới.</param>
    /// <returns>ForumTopicDto sau khi sửa, hoặc null nếu không tìm thấy chủ đề.</returns>
    Task<ForumTopicDto?> UpdateTopicAsync(int topicId, CreateForumTopicDto request);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xóa một chủ đề thảo luận trên diễn đàn (chỉ cho phép xóa khi chủ đề không còn bài viết nào).
    /// </summary>
    /// <param name="topicId">ID chủ đề cần xóa.</param>
    /// <returns>True nếu xóa thành công, False nếu không tìm thấy chủ đề.</returns>
    Task<bool> DeleteTopicAsync(int topicId);
}
