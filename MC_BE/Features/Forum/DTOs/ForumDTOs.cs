// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Core / Application DTOs (Data Transfer Objects).
// - Nằm trong module: Features/Forum/DTOs.
// - Vai trò: Định nghĩa các hợp đồng dữ liệu (Data Contracts) độc lập giữa Presentation Layer (Controllers),
//   Application Service Layer (ForumPostService, ForumCommentService, ForumInteractionService, AdminForumService)
//   và Client (React Web / Mobile App).
// - Nguyên lý: Ngăn chặn phơi bày trực tiếp thực thể CSDL (ForumPost, ForumComment, ForumReaction, ForumReport, ForumTopic),
//   bảo vệ dữ liệu nhạy cảm (như mật khẩu, hash, thông tin cá nhân khi ẩn danh IsAnonymous), chống tấn công Over-Posting,
//   và tối ưu hóa băng thông mạng bằng cách chỉ truyền tải đúng các trường cần thiết.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Phục vụ toàn bộ các luồng tương tác trên diễn đàn cộng đồng MC MSEEK:
//   1. Quản lý chủ đề thảo luận (Topic / Category): Tạo, chỉnh sửa, hiển thị số lượng bài viết.
//   2. Quản lý bài đăng (Post): Đăng bài kèm ảnh, ẩn danh tác giả (Anonymous), ghim (Pin), khóa bình luận (Lock), phân trang & tìm kiếm.
//   3. Hệ thống bình luận lồng nhau dạng cây (Hierarchical Tree Comments): Hỗ trợ trả lời (Replies), phân cấp (DepthLevel 1-2).
//   4. Tương tác xã hội (Interactions): Thả cảm xúc (Like, Love, Helpful) cho cả bài viết lẫn bình luận, theo dõi trạng thái tương tác cá nhân.
//   5. Báo cáo vi phạm & Kiểm duyệt (Moderation / Reporting): Báo cáo Spam, Độc hại, Xúc phạm; Admin duyệt/ẩn nội dung.
//   6. Hồ sơ diễn đàn (Forum User Profile): Thống kê số lượng bài viết, số bình luận và vai trò người dùng trong cộng đồng.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client -> Gửi Request DTOs (CreatePostRequest, CreateCommentRequest, ToggleReactionRequest...) qua Controller.
// - Controller -> Truyền Request DTOs vào Service Layer để thẩm định và xử lý nghiệp vụ.
// - Service Layer -> Ánh xạ Entity từ DB thành Response DTOs (ForumPostDto, ForumCommentDto, ForumTopicDto...) trả về Client.
// ====================================================================================================

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Forum.DTOs;

#region 1. TOPIC DTOs

/// <summary>
/// DTO chứa thông tin chủ đề thảo luận trên diễn đàn để hiển thị cho người dùng.
/// </summary>
public class ForumTopicDto
{
    // [Dòng này làm gì]: Khai báo thuộc tính lưu trữ khóa chính (ID) của chủ đề thảo luận.
    // [Giải phẫu từng từ khóa]:
    // - public: Access modifier cho phép tất cả các tầng truy cập và serialize dữ liệu.
    // - int: Kiểu số nguyên 32-bit (Value type) ánh xạ khóa chính tự tăng trong DB.
    // - { get; set; }: Auto-implemented Property cho phép đọc và ghi giá trị.
    // [Tại sao dùng & Rủi ro]: Định danh duy nhất để Client lọc bài viết theo chủ đề. int có giá trị mặc định là 0 nếu chưa gán.
    public int TopicId { get; set; }

    // [Dòng này làm gì]: Tên hiển thị của chủ đề (ví dụ: "Kỹ năng dẫn chương trình", "Giao lưu MC").
    // [Giải phẫu từng từ khóa]:
    // - public: Cho phép truy cập công khai.
    // - string: Kiểu chuỗi ký tự (Reference type) lưu tên chủ đề.
    // - { get; set; }: Cho phép đọc và ghi.
    // - = string.Empty;: Gán giá trị khởi tạo rỗng tránh cảnh báo CS8618 trong C# Nullable Reference Types.
    // [Tại sao dùng & Rủi ro]: Tránh NullReferenceException khi render tiêu đề danh mục trên giao diện.
    // [Cách viết thay thế]: Có thể dùng `required string Name { get; set; }` trong C# 11+.
    public string Name { get; set; } = string.Empty;

    // [Dòng này làm gì]: Đường dẫn tĩnh thân thiện (URL Slug) của chủ đề (ví dụ: "ky-nang-dan-chuong-trinh").
    // [Giải phẫu từng từ khóa]:
    // - public: Công khai để Controller serialize sang JSON trả về URL routing phía Frontend.
    // - string: Kiểu chuỗi ký tự.
    // - { get; set; }: Auto-property.
    // - = string.Empty;: Khởi tạo chuỗi rỗng tránh null.
    // [Tại sao dùng & Rủi ro]: Chuẩn hóa SEO và định tuyến phía Single Page Application (React Router).
    public string Slug { get; set; } = string.Empty;

    // [Dòng này làm gì]: Mô tả chi tiết mục đích và quy chế thảo luận của chủ đề.
    // [Giải phẫu từng từ khóa]:
    // - public: Truy cập công khai.
    // - string?: Kiểu chuỗi ký tự cho phép nhận giá trị null (Nullable reference type).
    // - { get; set; }: Auto-property.
    // [Tại sao dùng & Rủi ro]: Chủ đề có thể không cần mô tả; đánh dấu `?` giúp trình biên dịch không cảnh báo khi null.
    public string? Description { get; set; }

    // [Dòng này làm gì]: Tên biểu tượng (Icon class hoặc SVG name, ví dụ: "mic", "chat", "sparkles") hiển thị trên menu.
    // [Giải phẫu từng từ khóa]:
    // - public string?: Kiểu chuỗi cho phép null nếu chủ đề dùng icon mặc định.
    // - { get; set; }: Cho phép đọc và ghi.
    public string? Icon { get; set; }

    // [Dòng này làm gì]: Thứ tự ưu tiên sắp xếp hiển thị của chủ đề trên thanh điều hướng (Thứ tự tăng dần).
    // [Giải phẫu từng từ khóa]:
    // - public int: Số nguyên 32-bit.
    // - { get; set; }: Cho phép đọc và ghi.
    public int OrderIndex { get; set; }

    // [Dòng này làm gì]: Tổng số lượng bài viết đang hoạt động thuộc về chủ đề này.
    // [Giải phẫu từng từ khóa]:
    // - public int: Số nguyên đếm số bài viết.
    // - { get; set; }: Cho phép đọc và ghi.
    // [Tại sao dùng & Rủi ro]: Giúp người dùng biết mức độ sôi nổi của chủ đề mà không cần chạy query COUNT riêng ở client.
    public int PostsCount { get; set; }
}

/// <summary>
/// DTO chứa dữ liệu yêu cầu tạo mới chủ đề thảo luận dành riêng cho Quản trị viên (Admin).
/// </summary>
public class CreateForumTopicDto
{
    // [Dòng này làm gì]: Tiếp nhận tên chủ đề mới, kiểm tra bắt buộc và giới hạn độ dài tối đa 100 ký tự.
    // [Giải phẫu từng DataAnnotation & từ khóa]:
    // - [Required]: Validation attribute bắt buộc Client phải truyền tên, không được để trống hoặc null.
    // - [MaxLength(100)]: Ngăn chặn tràn bộ nhớ đệm và vượt quá dung lượng cột `varchar(100)` trong CSDL.
    // - public string Name { get; set; } = string.Empty;: Thuộc tính chuỗi khởi tạo rỗng tránh cảnh báo CS8618.
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    // [Dòng này làm gì]: Tiếp nhận URL slug tùy chỉnh nếu Admin muốn tự đặt, tối đa 120 ký tự.
    // [Giải phẫu từng từ khóa]:
    // - [MaxLength(120)]: Giới hạn độ dài URL thân thiện.
    // - public string? Slug { get; set; }: Kiểu chuỗi cho phép null; nếu null thì Service sẽ tự động sinh slug từ Name.
    [MaxLength(120)]
    public string? Slug { get; set; }

    // [Dòng này làm gì]: Tiếp nhận văn bản mô tả chủ đề.
    // [Giải phẫu từng từ khóa]:
    // - public string? Description { get; set; }: Thuộc tính chuỗi cho phép null nếu không có mô tả bổ sung.
    public string? Description { get; set; }

    // [Dòng này làm gì]: Tiếp nhận mã định danh icon hiển thị cho chủ đề.
    // [Giải phẫu từng từ khóa]:
    // - [MaxLength(50)]: Giới hạn tên icon tối đa 50 ký tự.
    // - public string? Icon { get; set; }: Cho phép null nếu sử dụng icon hệ thống mặc định.
    [MaxLength(50)]
    public string? Icon { get; set; }

    // [Dòng này làm gì]: Thứ tự sắp xếp mong muốn của chủ đề mới tạo (mặc định ưu tiên vị trí 1).
    // [Giải phẫu từng từ khóa]:
    // - public int OrderIndex { get; set; } = 1;: Khởi tạo giá trị mặc định là 1 nếu Client không truyền.
    public int OrderIndex { get; set; } = 1;
}

#endregion

#region 2. POST DTOs

/// <summary>
/// DTO đại diện cho một bài viết chi tiết trên diễn đàn, tích hợp thông tin tác giả, tương tác và trạng thái của người xem.
/// </summary>
public class ForumPostDto
{
    // [Dòng này làm gì]: Mã định danh duy nhất (Khóa chính) của bài viết.
    public int PostId { get; set; }

    // [Dòng này làm gì]: ID của chủ đề thảo luận chứa bài viết này.
    public int TopicId { get; set; }

    // [Dòng này làm gì]: Tên của chủ đề thảo luận (lấy từ bảng ForumTopics qua phép JOIN để tối ưu hiển thị ở Frontend).
    public string TopicName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Slug của chủ đề thảo luận để phục vụ điều hướng đường dẫn URL.
    public string TopicSlug { get; set; } = string.Empty;

    // [Dòng này làm gì]: ID của tác giả bài viết (nếu bài viết ẩn danh thì giá trị này sẽ bị ẩn hoặc mã hóa với người xem thường).
    public int AuthorId { get; set; }

    // [Dòng này làm gì]: Họ và tên hiển thị của tác giả (nếu IsAnonymous = true thì hiển thị "Người dùng ẩn danh").
    public string AuthorName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Email của tác giả (chỉ hiển thị với Admin hoặc chính chủ bài viết, người xem thường nhận giá trị null).
    public string? AuthorEmail { get; set; }

    // [Dòng này làm gì]: Ảnh đại diện (Avatar URL) của tác giả (null nếu ẩn danh hoặc người dùng chưa cài avatar).
    public string? AuthorAvatar { get; set; }

    // [Dòng này làm gì]: Vai trò của tác giả trong hệ thống (Learner, Instructor, Admin) để gắn huy hiệu (Badge) uy tín.
    public string AuthorRole { get; set; } = string.Empty;

    // [Dòng này làm gì]: Tiêu đề của bài viết diễn đàn.
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Toàn bộ nội dung văn bản của bài viết.
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Đường dẫn hình ảnh minh họa đính kèm bài viết (lưu trên Cloudinary CDN, cho phép null nếu không có ảnh).
    public string? ImageUrl { get; set; }

    // [Dòng này làm gì]: Số lượt xem bài viết (tự động tăng khi có người truy cập xem chi tiết).
    public int ViewsCount { get; set; }

    // [Dòng này làm gì]: Tổng số lượt thả cảm xúc (Reactions) của bài viết.
    public int ReactionsCount { get; set; }

    // [Dòng này làm gì]: Tổng số lượng bình luận của bài viết.
    public int CommentsCount { get; set; }

    // [Dòng này làm gì]: Tổng số lượt báo cáo vi phạm của bài viết (dùng cho Admin theo dõi nội dung phản cảm).
    public int ReportsCount { get; set; }

    // [Dòng này làm gì]: Trạng thái kiểm duyệt của bài viết (PUBLISHED, HIDDEN_BY_ADMIN, DELETED).
    // [Tại sao khởi tạo "PUBLISHED"]: Mặc định bài viết tạo thành công sẽ ở trạng thái xuất bản công khai.
    public string Status { get; set; } = "PUBLISHED";

    // [Dòng này làm gì]: Cờ đánh dấu bài viết có được Ghim lên đầu diễn đàn bởi Admin hay không.
    public bool IsPinned { get; set; }

    // [Dòng này làm gì]: Cờ đánh dấu bài viết có bị Khóa (ngăn chặn thêm bình luận mới) hay không.
    public bool IsLocked { get; set; }

    // [Dòng này làm gì]: Cờ đánh dấu bài viết ở chế độ Ẩn danh (giấu thông tin tác giả với cộng đồng).
    public bool IsAnonymous { get; set; }

    // [Dòng này làm gì]: Thời điểm tạo bài viết (UTC DateTime).
    public DateTime CreatedAt { get; set; }

    // [Dòng này làm gì]: Thời điểm chỉnh sửa bài viết lần gần nhất.
    public DateTime UpdatedAt { get; set; }

    // [Dòng này làm gì]: Loại cảm xúc mà người dùng hiện tại đang đăng nhập đã thả (LIKE, LOVE, HELPFUL hoặc null nếu chưa thả).
    public string? UserReaction { get; set; }

    // [Dòng này làm gì]: Cờ cho biết người dùng hiện tại đã từng báo cáo vi phạm bài viết này hay chưa.
    public bool UserHasReported { get; set; }

    // [Dòng này làm gì]: Cờ cho biết người dùng hiện tại có phải chính là tác giả của bài viết này hay không (để hiện nút Sửa/Xóa).
    public bool IsAuthor { get; set; }
}

/// <summary>
/// DTO chứa dữ liệu yêu cầu đăng bài viết mới trên diễn đàn.
/// </summary>
public class CreatePostRequest
{
    // [Dòng này làm gì]: ID của chủ đề thảo luận muốn đăng bài vào. Bắt buộc phải chọn.
    [Required]
    public int TopicId { get; set; }

    // [Dòng này làm gì]: Tiêu đề bài viết bắt buộc nhập và không vượt quá 255 ký tự.
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Nội dung bài viết bắt buộc nhập, không được để trống.
    [Required]
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Link ảnh minh họa bài viết đã upload thành công lên CDN.
    public string? ImageUrl { get; set; }

    // [Dòng này làm gì]: Tùy chọn ẩn danh tác giả khi đăng bài (mặc định là false - công khai danh tính).
    public bool IsAnonymous { get; set; } = false;
}

/// <summary>
/// DTO chứa dữ liệu yêu cầu cập nhật nội dung bài viết đã đăng.
/// </summary>
public class UpdatePostRequest
{
    // [Dòng này làm gì]: ID chủ đề mới nếu tác giả muốn chuyển bài viết sang chủ đề khác.
    [Required]
    public int TopicId { get; set; }

    // [Dòng này làm gì]: Tiêu đề mới của bài viết, tối đa 255 ký tự.
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    // [Dòng này làm gì]: Nội dung văn bản cập nhật của bài viết.
    [Required]
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Link ảnh mới hoặc giữ nguyên ảnh cũ.
    public string? ImageUrl { get; set; }

    // [Dòng này làm gì]: Cập nhật chế độ ẩn danh hoặc công khai danh tính.
    public bool IsAnonymous { get; set; } = false;
}

/// <summary>
/// DTO chứa các tham số lọc, phân trang và sắp xếp danh sách bài viết trên diễn đàn.
/// </summary>
public class PostQueryParameters
{
    // [Dòng này làm gì]: Số trang hiện tại cần lấy (mặc định là trang 1).
    public int Page { get; set; } = 1;

    // [Dòng này làm gì]: Số lượng bài viết tối đa trên một trang (mặc định là 10 bài/trang).
    public int Limit { get; set; } = 10;

    // [Dòng này làm gì]: ID chủ đề cần lọc (null nếu muốn lấy tất cả chủ đề).
    public int? TopicId { get; set; }

    // [Dòng này làm gì]: Từ khóa tìm kiếm theo tiêu đề hoặc nội dung bài viết.
    public string? Search { get; set; }

    // [Dòng này làm gì]: Tiêu chí sắp xếp: "latest" (mới nhất), "hot" (nhiều reaction nhất), "most_commented" (nhiều bình luận nhất).
    public string SortBy { get; set; } = "latest"; // latest, hot, most_commented
}

#endregion

#region 3. COMMENT DTOs

/// <summary>
/// DTO biểu diễn dữ liệu bình luận dạng cấu trúc cây phân cấp (Hierarchical Tree) với danh sách câu trả lời con (Replies).
/// </summary>
public class ForumCommentDto
{
    // [Dòng này làm gì]: Khóa chính của bình luận.
    public int CommentId { get; set; }

    // [Dòng này làm gì]: ID của bài viết chứa bình luận này.
    public int PostId { get; set; }

    // [Dòng này làm gì]: ID của người viết bình luận.
    public int AuthorId { get; set; }

    // [Dòng này làm gì]: Tên hiển thị của tác giả bình luận (hoặc "Người dùng ẩn danh").
    public string AuthorName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Ảnh đại diện của tác giả bình luận.
    public string? AuthorAvatar { get; set; }

    // [Dòng này làm gì]: Vai trò của tác giả bình luận (Learner, Instructor, Admin).
    public string AuthorRole { get; set; } = string.Empty;

    // [Dòng này làm gì]: ID của bình luận cha nếu đây là câu trả lời (Reply); null nếu là bình luận gốc (Root comment).
    public int? ParentCommentId { get; set; }

    // [Dòng này làm gì]: Độ sâu phân cấp của bình luận (Level 1: Gốc, Level 2: Trả lời lồng nhau tối đa).
    public int DepthLevel { get; set; } = 1;

    // [Dòng này làm gì]: Nội dung văn bản của bình luận.
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Ảnh đính kèm trong bình luận (nếu có).
    public string? ImageUrl { get; set; }

    // [Dòng này làm gì]: Cờ đánh dấu bình luận ẩn danh.
    public bool IsAnonymous { get; set; }

    // [Dòng này làm gì]: Tổng số cảm xúc của bình luận.
    public int ReactionsCount { get; set; }

    // [Dòng này làm gì]: Tổng số lượt báo cáo vi phạm của bình luận.
    public int ReportsCount { get; set; }

    // [Dòng này làm gì]: Trạng thái của bình luận (ACTIVE, HIDDEN_BY_ADMIN, DELETED).
    public string Status { get; set; } = "ACTIVE";

    // [Dòng này làm gì]: Thời điểm tạo bình luận.
    public DateTime CreatedAt { get; set; }

    // [Dòng này làm gì]: Thời điểm chỉnh sửa bình luận lần gần nhất.
    public DateTime UpdatedAt { get; set; }

    // [Dòng này làm gì]: Cảm xúc của người dùng hiện tại đối với bình luận này.
    public string? UserReaction { get; set; }

    // [Dòng này làm gì]: Cờ cho biết người dùng hiện tại đã báo cáo bình luận này chưa.
    public bool UserHasReported { get; set; }

    // [Dòng này làm gì]: Cờ cho biết người dùng hiện tại có phải tác giả của bình luận này không.
    public bool IsAuthor { get; set; }

    // [Dòng này làm gì]: Danh sách các câu trả lời con lồng nhau bên dưới bình luận này.
    // [Tại sao khởi tạo new List]: Đảm bảo Client luôn nhận mảng rỗng `[]` thay vì `null` khi serialize sang JSON.
    public List<ForumCommentDto> Replies { get; set; } = new List<ForumCommentDto>();
}

/// <summary>
/// DTO chứa thông tin yêu cầu tạo một bình luận mới cho bài viết hoặc trả lời bình luận khác.
/// </summary>
public class CreateCommentRequest
{
    // [Dòng này làm gì]: Bắt buộc chỉ định ID của bài viết cần bình luận.
    [Required]
    public int PostId { get; set; }

    // [Dòng này làm gì]: ID của bình luận cha nếu muốn trả lời bình luận cụ thể (cho phép null nếu là bình luận gốc).
    public int? ParentCommentId { get; set; }

    // [Dòng này làm gì]: Nội dung bình luận bắt buộc không được để trống.
    [Required]
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Đường dẫn ảnh đính kèm bình luận (nếu có).
    public string? ImageUrl { get; set; }

    // [Dòng này làm gì]: Tùy chọn ẩn danh khi gửi bình luận (mặc định false).
    public bool IsAnonymous { get; set; } = false;
}

/// <summary>
/// DTO chứa thông tin yêu cầu cập nhật nội dung bình luận đã gửi.
/// </summary>
public class UpdateCommentRequest
{
    // [Dòng này làm gì]: Nội dung bình luận mới cập nhật, bắt buộc không được rỗng.
    [Required]
    public string Content { get; set; } = string.Empty;

    // [Dòng này làm gì]: Ảnh đính kèm mới hoặc giữ nguyên ảnh cũ.
    public string? ImageUrl { get; set; }

    // [Dòng này làm gì]: Cập nhật chế độ ẩn danh cho bình luận.
    public bool IsAnonymous { get; set; } = false;
}

#endregion

#region 4. REACTION & INTERACTION DTOs

/// <summary>
/// DTO yêu cầu bật/tắt hoặc đổi loại cảm xúc (Reaction) trên bài viết hoặc bình luận.
/// </summary>
public class ToggleReactionRequest
{
    // [Dòng này làm gì]: Đối tượng nhận cảm xúc: "POST" (Bài viết) hoặc "COMMENT" (Bình luận). Bắt buộc.
    [Required]
    public string TargetType { get; set; } = "POST"; // POST or COMMENT

    // [Dòng này làm gì]: ID bài viết nếu TargetType là "POST".
    public int? PostId { get; set; }

    // [Dòng này làm gì]: ID bình luận nếu TargetType là "COMMENT".
    public int? CommentId { get; set; }

    // [Dòng này làm gì]: Loại cảm xúc muốn thả: "LIKE", "LOVE", "HELPFUL". Bắt buộc.
    [Required]
    public string ReactionType { get; set; } = "LIKE"; // LIKE, LOVE, HELPFUL
}

/// <summary>
/// DTO tổng hợp kết quả phản hồi sau khi thả hoặc hủy cảm xúc.
/// </summary>
public class ForumReactionSummaryDto
{
    // [Dòng này làm gì]: Cờ cho biết sau thao tác toggle, người dùng hiện tại có đang thả cảm xúc hay đã hủy (true = đang thả, false = đã hủy).
    public bool IsReacted { get; set; }

    // [Dòng này làm gì]: Loại cảm xúc hiện tại của người dùng (null nếu đã hủy thả).
    public string? ReactionType { get; set; }

    // [Dòng này làm gì]: Tổng số lượng cảm xúc được cập nhật của đối tượng (Post hoặc Comment).
    public int TotalReactions { get; set; }
}

#endregion

#region 5. REPORT & MODERATION DTOs

/// <summary>
/// DTO chứa thông tin yêu cầu báo cáo vi phạm nội dung (Bài viết hoặc Bình luận) trên diễn đàn.
/// </summary>
public class CreateReportRequest
{
    // [Dòng này làm gì]: Bắt buộc chỉ định loại đối tượng bị báo cáo: "POST" hoặc "COMMENT".
    [Required]
    public string TargetType { get; set; } = "POST"; // POST or COMMENT

    // [Dòng này làm gì]: ID bài viết bị báo cáo (nếu TargetType == "POST").
    public int? PostId { get; set; }

    // [Dòng này làm gì]: ID bình luận bị báo cáo (nếu TargetType == "COMMENT").
    public int? CommentId { get; set; }

    // [Dòng này làm gì]: Lý do báo cáo vi phạm theo danh mục chuẩn: "SPAM", "HARASSMENT", "INAPPROPRIATE", "MISINFORMATION", "OTHER".
    [Required]
    public string Reason { get; set; } = "OTHER"; // SPAM, HARASSMENT, INAPPROPRIATE, MISINFORMATION, OTHER

    // [Dòng này làm gì]: Mô tả chi tiết lý do vi phạm do người dùng cung cấp thêm (tối đa 500 ký tự).
    public string? Details { get; set; }
}

/// <summary>
/// DTO đại diện cho một bản ghi báo cáo vi phạm để hiển thị trên Dashboard kiểm duyệt của Quản trị viên (Admin).
/// </summary>
public class ForumReportDto
{
    // [Dòng này làm gì]: Mã định danh của bản ghi báo cáo vi phạm.
    public int ReportId { get; set; }

    // [Dòng này làm gì]: ID của người gửi đơn báo cáo.
    public int ReporterId { get; set; }

    // [Dòng này làm gì]: Tên của người gửi báo cáo.
    public string ReporterName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Loại đối tượng bị báo cáo ("POST" hoặc "COMMENT").
    public string TargetType { get; set; } = "POST";

    // [Dòng này làm gì]: ID bài viết liên quan (nếu có).
    public int? PostId { get; set; }

    // [Dòng này làm gì]: Tiêu đề bài viết bị báo cáo để Admin nắm bắt nhanh ngữ cảnh.
    public string? PostTitle { get; set; }

    // [Dòng này làm gì]: Toàn bộ nội dung bài viết bị báo cáo.
    public string? PostContent { get; set; }

    // [Dòng này làm gì]: Ảnh đính kèm của bài viết bị báo cáo.
    public string? PostImageUrl { get; set; }

    // [Dòng này làm gì]: Tên chủ đề của bài viết bị báo cáo.
    public string? PostTopicName { get; set; }

    // [Dòng này làm gì]: ID của bình luận bị báo cáo (nếu TargetType == "COMMENT").
    public int? CommentId { get; set; }

    // [Dòng này làm gì]: Đoạn trích dẫn ngắn của bình luận bị báo cáo.
    public string? CommentSnippet { get; set; }

    // [Dòng này làm gì]: Toàn văn nội dung bình luận bị báo cáo.
    public string? CommentContent { get; set; }

    // [Dòng này làm gì]: Ảnh đính kèm trong bình luận bị báo cáo.
    public string? CommentImageUrl { get; set; }

    // [Dòng này làm gì]: ID của tác giả bài viết/bình luận bị báo cáo (để Admin xử lý kỷ luật hoặc khóa tài khoản).
    public int AuthorId { get; set; }

    // [Dòng này làm gì]: Tên của tác giả bị báo cáo.
    public string AuthorName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Email của tác giả bị báo cáo.
    public string? AuthorEmail { get; set; }

    // [Dòng này làm gì]: Trạng thái kiểm duyệt hiện tại của đối tượng bị báo cáo ("ACTIVE", "HIDDEN_BY_ADMIN", "DELETED").
    public string TargetStatus { get; set; } = "ACTIVE";

    // [Dòng này làm gì]: Phân loại lý do vi phạm ("SPAM", "HARASSMENT", v.v.).
    public string Reason { get; set; } = string.Empty;

    // [Dòng này làm gì]: Chi tiết giải trình lý do vi phạm.
    public string? Details { get; set; }

    // [Dòng này làm gì]: Trạng thái xử lý của đơn báo cáo ("PENDING" - chờ duyệt, "RESOLVED" - đã xử lý, "DISMISSED" - bác bỏ/báo cáo sai).
    public string Status { get; set; } = "PENDING";

    // [Dòng này làm gì]: Thời điểm gửi đơn báo cáo.
    public DateTime CreatedAt { get; set; }

    // [Dòng này làm gì]: Thời điểm Admin hoàn tất xử lý đơn báo cáo.
    public DateTime? ResolvedAt { get; set; }

    // [Dòng này làm gì]: Tên của Quản trị viên đã xử lý đơn báo cáo này.
    public string? ResolvedByName { get; set; }
}

/// <summary>
/// DTO chứa yêu cầu thay đổi trạng thái kiểm duyệt của bài viết hoặc bình luận từ phía Quản trị viên.
/// </summary>
public class UpdateItemStatusRequest
{
    // [Dòng này làm gì]: Trạng thái mới muốn áp dụng: "PUBLISHED" (hoặc "ACTIVE"), "HIDDEN_BY_ADMIN" (Ẩn do vi phạm), "DELETED" (Xóa mềm).
    [Required]
    public string Status { get; set; } = "PUBLISHED"; // PUBLISHED/ACTIVE, HIDDEN_BY_ADMIN, DELETED
}

#endregion

#region 6. USER PROFILE DTOs

/// <summary>
/// DTO biểu diễn hồ sơ cá nhân và chỉ số hoạt động đóng góp của thành viên trên diễn đàn MSEEK.
/// </summary>
public class ForumUserProfileDto
{
    // [Dòng này làm gì]: ID tài khoản người dùng trong hệ thống.
    public int UserId { get; set; }

    // [Dòng này làm gì]: Họ và tên đầy đủ của người dùng.
    public string FullName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Đường dẫn ảnh đại diện cá nhân (Avatar URL).
    public string? AvatarUrl { get; set; }

    // [Dòng này làm gì]: Vai trò trong hệ thống (Learner, Instructor, Admin). Mặc định là "Learner".
    public string RoleName { get; set; } = "Learner";

    // [Dòng này làm gì]: Thời điểm người dùng tạo tài khoản và gia nhập diễn đàn MSEEK.
    public DateTime JoinedAt { get; set; }

    // [Dòng này làm gì]: Tổng số lượng bài viết người dùng đã đóng góp trên diễn đàn.
    public int PostsCount { get; set; }

    // [Dòng này làm gì]: Tổng số lượng bình luận người dùng đã tương tác và thảo luận.
    public int CommentsCount { get; set; }
}

#endregion
