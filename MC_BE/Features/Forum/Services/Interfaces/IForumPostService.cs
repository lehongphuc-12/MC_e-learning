// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Abstraction (Interface) trong Application Core / Business Logic Layer.
// - Nằm trong module: Features/Forum/Services/Interfaces.
// - Vai trò: Định nghĩa hợp đồng nghiệp vụ trung tâm của module Diễn đàn (Forum Posts, Topics, Profiles).
// - Nguyên lý: Dependency Inversion Principle (DIP). Cho phép ForumPostsController phụ thuộc vào hợp đồng trừu tượng,
//   dễ dàng bảo trì, kiểm thử và mở rộng nghiệp vụ diễn đàn.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Quản lý trọn vẹn luồng đăng tải và tra cứu bài viết cộng đồng:
//   1. Lấy danh mục chủ đề (Topics) kèm số đếm bài viết.
//   2. Tra cứu danh sách bài viết có phân trang (Pagination), tìm kiếm (Search), lọc theo chủ đề (Filter by Topic),
//      và sắp xếp linh hoạt (Mới nhất - Latest, Nổi bật - Hot theo reactions, Nhiều thảo luận nhất - Most Commented).
//   3. Xem chi tiết bài viết, tự động tăng lượt xem (ViewsCount) không trùng lặp.
//   4. Đăng bài mới và cập nhật bài viết, hỗ trợ chế độ Ẩn danh (IsAnonymous) bảo vệ quyền riêng tư của tác giả.
//   5. Xóa bài viết (Soft Delete chuyển status thành DELETED) với kiểm tra quyền tác giả hoặc Admin.
//   6. Truy xuất hồ sơ hoạt động của thành viên diễn đàn (ForumUserProfileDto) thống kê số bài đăng và bình luận.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: ForumPostsController inject IForumPostService.
// - Triển khai: ForumPostService.
// - CSDL: SmartMcDbContext truy vấn ForumPosts, ForumTopics, ForumComments, ForumReactions, Users.
// ====================================================================================================

using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;

namespace MC_BE.Features.Forum.Services.Interfaces;

/// <summary>
/// Giao diện định nghĩa các nghiệp vụ cốt lõi về Bài viết, Chủ đề và Hồ sơ người dùng trên diễn đàn MSEEK.
/// </summary>
public interface IForumPostService
{
    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách toàn bộ các chủ đề thảo luận đang hoạt động, sắp xếp theo OrderIndex tăng dần.
    /// </summary>
    /// <returns>Danh sách các ForumTopicDto kèm số lượng bài viết tương ứng.</returns>
    Task<List<ForumTopicDto>> GetTopicsAsync();

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Truy vấn danh sách bài viết trên diễn đàn với bộ lọc tìm kiếm, chủ đề, sắp xếp và phân trang.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Lọc bài viết có trạng thái PUBLISHED (nếu là Admin thì cho phép xem cả bài ẩn/xóa nếu có yêu cầu).</para>
    /// <para>Bước 2: Lọc theo TopicId và Search (từ khóa trong Title hoặc Content) nếu có tham số.</para>
    /// <para>Bước 3: Sắp xếp ưu tiên bài viết Ghim (IsPinned = true) lên đầu, tiếp theo là SortBy (latest, hot, most_commented).</para>
    /// <para>Bước 4: Phân trang Skip và Take, ánh xạ sang ForumPostDto kèm trạng thái tương tác cá nhân (UserReaction, IsAuthor).</para>
    /// <para>Bước 5: Trả về PaginatedResult chứa danh sách bài viết và thông tin trang.</para>
    /// </summary>
    /// <param name="query">Bộ tham số phân trang, tìm kiếm và sắp xếp.</param>
    /// <param name="currentUserId">ID người dùng hiện tại (nếu đã đăng nhập) để kiểm tra tương tác cá nhân.</param>
    /// <param name="isAdmin">Cờ quyền Quản trị viên.</param>
    /// <returns>Đối tượng phân trang PaginatedResult chứa danh sách ForumPostDto.</returns>
    Task<PaginatedResult<ForumPostDto>> GetPostsAsync(PostQueryParameters query, int? currentUserId, bool isAdmin);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy thông tin chi tiết một bài viết cụ thể theo ID và tự động tăng số lượt xem (ViewsCount).
    /// <para>Quy tắc kiểm tra: Bài viết phải ở trạng thái PUBLISHED hoặc người xem phải là tác giả hoặc Admin.</para>
    /// </summary>
    /// <param name="postId">ID của bài viết cần xem.</param>
    /// <param name="currentUserId">ID người dùng đang xem.</param>
    /// <param name="isAdmin">Cờ quyền Quản trị viên.</param>
    /// <returns>ForumPostDto chi tiết hoặc null nếu không tìm thấy bài viết.</returns>
    Task<ForumPostDto?> GetPostByIdAsync(int postId, int? currentUserId, bool isAdmin);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Đăng một bài viết mới lên diễn đàn thuộc về một chủ đề thảo luận cụ thể.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Kiểm tra TopicId có tồn tại và hợp lệ trong CSDL không.</para>
    /// <para>Bước 2: Khởi tạo thực thể ForumPost với trạng thái PUBLISHED, thiết lập IsAnonymous theo yêu cầu.</para>
    /// <para>Bước 3: Lưu vào CSDL và ánh xạ sang ForumPostDto trả về.</para>
    /// </summary>
    /// <param name="authorId">ID của người dùng đăng bài.</param>
    /// <param name="request">Payload chứa thông tin bài viết (TopicId, Title, Content, ImageUrl, IsAnonymous).</param>
    /// <returns>ForumPostDto chi tiết của bài viết vừa đăng thành công.</returns>
    Task<ForumPostDto> CreatePostAsync(int authorId, CreatePostRequest request);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cập nhật tiêu đề, nội dung hoặc ảnh của bài viết đã đăng.
    /// <para>Quy tắc bảo mật: Chỉ chính tác giả bài viết (AuthorId == userId) mới có quyền chỉnh sửa nội dung bài viết.</para>
    /// </summary>
    /// <param name="postId">ID của bài viết cần sửa.</param>
    /// <param name="userId">ID người dùng đang thực hiện yêu cầu sửa.</param>
    /// <param name="request">Payload chứa thông tin cập nhật mới.</param>
    /// <returns>ForumPostDto sau khi cập nhật hoặc null nếu bài viết không tồn tại.</returns>
    Task<ForumPostDto?> UpdatePostAsync(int postId, int userId, UpdatePostRequest request);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xóa bài viết khỏi diễn đàn (Áp dụng Soft Delete chuyển trạng thái thành DELETED).
    /// <para>Quy tắc phân quyền: Phải là tác giả của bài viết hoặc tài khoản có quyền Admin.</para>
    /// </summary>
    /// <param name="postId">ID bài viết cần xóa.</param>
    /// <param name="userId">ID người dùng yêu cầu xóa.</param>
    /// <param name="isAdmin">Cờ quyền Quản trị viên.</param>
    /// <returns>True nếu xóa thành công, False nếu bài viết không tồn tại.</returns>
    Task<bool> DeletePostAsync(int postId, int userId, bool isAdmin);

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Truy xuất hồ sơ thành viên diễn đàn bao gồm thông tin cá nhân và tổng số bài viết, bình luận đã đóng góp.
    /// </summary>
    /// <param name="userId">ID người dùng cần xem hồ sơ.</param>
    /// <returns>ForumUserProfileDto chứa các chỉ số đóng góp hoặc null nếu người dùng không tồn tại.</returns>
    Task<ForumUserProfileDto?> GetUserProfileAsync(int userId);
}
