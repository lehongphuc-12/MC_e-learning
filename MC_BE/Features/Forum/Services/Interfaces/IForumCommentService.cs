// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Abstraction (Interface) trong Application Core / Business Logic Layer.
// - Nằm trong module: Features/Forum/Services/Interfaces.
// - Vai trò: Định nghĩa hợp đồng nghiệp vụ cho hệ thống Bình luận (Forum Comments) trên diễn đàn.
// - Nguyên lý: Áp dụng Dependency Inversion Principle (DIP). Controller (ForumCommentsController) giao tiếp qua
//   Interface này để thực hiện truy vấn cây bình luận, thêm, sửa, xóa bình luận.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Quản lý tương tác thảo luận nhiều cấp (Hierarchical Multi-Level Comments):
//   1. Xây dựng cây bình luận lồng nhau (Replies Tree) từ danh sách phẳng trong DB, tối ưu độ sâu tối đa 2 cấp (Root & Child).
//   2. Hỗ trợ bình luận ẩn danh (Anonymous) mà vẫn lưu vết UserId thật trong CSDL để phục vụ kiểm duyệt.
//   3. Kiểm soát quyền sở hữu: Chỉ tác giả bình luận hoặc Admin mới có quyền cập nhật hoặc xóa bình luận.
//   4. Tự động đồng bộ biến đếm CommentsCount trên thực thể ForumPost khi có bình luận mới hoặc khi xóa bình luận.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: ForumCommentsController inject IForumCommentService.
// - Triển khai: ForumCommentService thực hiện logic xử lý dữ liệu và cây phân cấp.
// - CSDL: Thao tác trên bảng ForumComments, ForumPosts, ForumReactions và ForumReports.
// ====================================================================================================

using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Features.Forum.DTOs;

namespace MC_BE.Features.Forum.Services.Interfaces;

/// <summary>
/// Giao diện định nghĩa các nghiệp vụ tương tác với bình luận trên diễn đàn MSEEK.
/// </summary>
public interface IForumCommentService
{
    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy toàn bộ danh sách bình luận của một bài viết cụ thể, được tổ chức thành cấu trúc cây phân cấp (Root Comments kèm Replies lồng nhau).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Truy vấn tất cả bình luận hợp lệ thuộc postId (với người dùng thường chỉ lấy status ACTIVE, với Admin lấy cả HIDDEN/DELETED).</para>
    /// <para>Bước 2: Lấy thông tin tương tác cá nhân (UserReaction, UserHasReported, IsAuthor) cho currentUserId.</para>
    /// <para>Bước 3: Thuật toán dựng cây: Gom các bình luận con (ParentCommentId != null) vào danh sách Replies của bình luận cha tương ứng.</para>
    /// <para>Bước 4: Trả về danh sách bình luận gốc (ParentCommentId == null) đã được sắp xếp theo thời gian.</para>
    /// </summary>
    /// <param name="postId">ID của bài viết cần tải bình luận.</param>
    /// <param name="currentUserId">ID người dùng đang đăng nhập (hoặc null nếu xem ở chế độ khách vãng lai).</param>
    /// <param name="isAdmin">Cờ cho biết người dùng có quyền Quản trị viên hay không (để hiển thị bình luận bị ẩn).</param>
    /// <returns>Danh sách ForumCommentDto đại diện cho các bình luận gốc kèm các bình luận con lồng nhau.</returns>
    Task<List<ForumCommentDto>> GetCommentsByPostIdAsync(int postId, int? currentUserId, bool isAdmin);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Tạo mới một bình luận cho bài viết hoặc trả lời một bình luận cha có sẵn.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Kiểm tra bài viết có tồn tại và có bị khóa (IsLocked) hoặc bị ẩn/xóa hay không.</para>
    /// <para>Bước 2: Nếu có ParentCommentId, kiểm tra bình luận cha có tồn tại và tính toán DepthLevel (tối đa cấp 2).</para>
    /// <para>Bước 3: Khởi tạo thực thể ForumComment, lưu vào CSDL.</para>
    /// <para>Bước 4: Tăng biến đếm CommentsCount của ForumPost tương ứng lên 1 đơn vị.</para>
    /// <para>Bước 5: Ánh xạ và trả về ForumCommentDto vừa tạo cho Client.</para>
    /// </summary>
    /// <param name="authorId">ID của người dùng gửi bình luận.</param>
    /// <param name="request">Payload chứa thông tin bình luận (PostId, ParentCommentId, Content, ImageUrl, IsAnonymous).</param>
    /// <returns>ForumCommentDto chi tiết của bình luận vừa đăng.</returns>
    Task<ForumCommentDto> AddCommentAsync(int authorId, CreateCommentRequest request);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Chỉnh sửa nội dung văn bản hoặc ảnh đính kèm của bình luận đã đăng.
    /// <para>Quy tắc kiểm tra: Chỉ chính tác giả tạo ra bình luận (AuthorId == userId) mới được phép cập nhật nội dung.</para>
    /// </summary>
    /// <param name="commentId">ID của bình luận cần chỉnh sửa.</param>
    /// <param name="userId">ID người dùng đang yêu cầu sửa.</param>
    /// <param name="request">Payload chứa nội dung mới và cờ ẩn danh.</param>
    /// <returns>ForumCommentDto sau khi cập nhật, hoặc null nếu không tìm thấy bình luận.</returns>
    Task<ForumCommentDto?> UpdateCommentAsync(int commentId, int userId, UpdateCommentRequest request);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xóa bình luận khỏi diễn đàn (Áp dụng cơ chế Xóa mềm - Soft Delete chuyển trạng thái thành DELETED).
    /// <para>Quy tắc phân quyền: Người thực hiện phải là tác giả của bình luận hoặc tài khoản có quyền Admin.</para>
    /// <para>Hệ quả: Giảm biến đếm CommentsCount của ForumPost tương ứng.</para>
    /// </summary>
    /// <param name="commentId">ID của bình luận cần xóa.</param>
    /// <param name="userId">ID người dùng yêu cầu xóa.</param>
    /// <param name="isAdmin">Cờ quyền Quản trị viên.</param>
    /// <returns>True nếu xóa thành công, False nếu bình luận không tồn tại.</returns>
    Task<bool> DeleteCommentAsync(int commentId, int userId, bool isAdmin);
}
