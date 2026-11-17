// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture / Feature-based).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định nghĩa các Model đóng gói dữ liệu Request/Response cho tính năng Nhạc nền luyện tập Speaking
//   (Background Music Management) phục vụ luyện phát âm, kịch bản dẫn chương trình.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Quản lý nhạc nền cho bài học: Hỗ trợ giảng viên tải lên file âm thanh (.mp3, .wav, .ogg), tải trước lên Cloudinary
//   (Pre-upload), liên kết nhạc nền vào bài học (LinkBackgroundMusics), hoặc gán làm nhạc nền mặc định hệ thống.
// - Phục vụ trải nghiệm học viên khi thực hành thu âm bài nói với nhạc nền du dương đúng phong cách MC/thuyết trình.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client: Gửi Multipart Form Data (file nhạc) hoặc JSON payload tới BackgroundMusicController.
// - Controller: Nhận DTOs -> chuyển qua BackgroundMusicService.
// - External Service: CloudinaryDotNet tải file nhạc lên đám mây, trả về AudioUrl và CloudinaryPublicId.
// - Database: Bảng BackgroundMusics lưu thông tin nhạc nền gắn với LessonId hoặc SystemDefault.
// ====================================================================================================

using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO đại diện cho thông tin bản nhạc nền trả về cho Client phát trong quá trình luyện tập Speaking.
/// </summary>
public class BackgroundMusicDto
{
    /// <summary>
    /// Mã định danh duy nhất của bản nhạc trong bảng BackgroundMusics (Primary Key).
    /// </summary>
    public int MusicId { get; set; }

    /// <summary>
    /// Tên bài nhạc hoặc mô tả thể loại nhạc (ví dụ: "Nhẹ nhàng - Truyền cảm", "Sôi động - Talkshow").
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Đường dẫn CDN trực tiếp (Cloudinary Audio URL) để phát nhạc phía frontend HTML5 Audio Player.
    /// </summary>
    public string AudioUrl { get; set; } = string.Empty;

    /// <summary>
    /// Cờ đánh dấu đây là nhạc nền mặc định của hệ thống (áp dụng cho tất cả bài tập nếu bài học không cấu hình riêng).
    /// </summary>
    public bool IsSystemDefault { get; set; }

    /// <summary>
    /// Khóa ngoại liên kết tới bài học cụ thể (LessonId). Nếu null, bản nhạc có thể là nhạc dùng chung toàn hệ thống.
    /// </summary>
    public int? LessonId { get; set; }
}

/// <summary>
/// Request DTO nhận file âm thanh upload trực tiếp qua multipart/form-data từ Giảng viên/Admin.
/// </summary>
public class UploadBackgroundMusicRequest
{
    /// <summary>
    /// Tiêu đề bản nhạc, bắt buộc nhập, giới hạn tối đa 200 ký tự để tối ưu hiển thị giao diện.
    /// </summary>
    [Required(ErrorMessage = "Tiêu đề bản nhạc không được để trống.")]
    [MaxLength(200, ErrorMessage = "Tiêu đề không được vượt quá 200 ký tự.")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// File âm thanh nhị phân gửi lên từ form multipart (.mp3, .wav, .ogg).
    /// </summary>
    [Required(ErrorMessage = "Vui lòng chọn tập tin âm thanh (.mp3, .wav, .ogg).")]
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// DTO trả về kết quả sau khi upload tạm file nhạc lên Cloudinary (Pre-upload step),
/// cho phép xem trước hoặc liên kết hàng loạt sau đó mà không cần upload lại.
/// </summary>
public class PreUploadMusicResultDto
{
    /// <summary>
    /// Tiêu đề bản nhạc sau khi được chuẩn hóa tên file hoặc người dùng nhập.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// URL lưu trữ file nhạc bảo mật trên CDN Cloudinary.
    /// </summary>
    public string AudioUrl { get; set; } = string.Empty;

    /// <summary>
    /// Public ID của tài nguyên âm thanh trên Cloudinary, dùng cho việc xóa hoặc quản lý vòng đời tài nguyên.
    /// </summary>
    public string CloudinaryPublicId { get; set; } = string.Empty;
}

/// <summary>
/// DTO đại diện cho một bản ghi nhạc nền cần liên kết vào bài học trong tác vụ liên kết hàng loạt (Batch Link).
/// </summary>
public class LinkBackgroundMusicItem
{
    /// <summary>
    /// Tiêu đề bản nhạc.
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// URL lưu trữ file âm thanh trên Cloudinary hoặc máy chủ lưu trữ.
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string AudioUrl { get; set; } = string.Empty;

    /// <summary>
    /// Khóa Public ID tài nguyên trên Cloudinary (nếu có).
    /// </summary>
    [MaxLength(500)]
    public string? CloudinaryPublicId { get; set; }
}

/// <summary>
/// Request DTO chứa danh sách các bản nhạc nền cần liên kết vào bài học.
/// </summary>
public class LinkBackgroundMusicsRequest
{
    /// <summary>
    /// Danh sách các bản nhạc nền được liên kết.
    /// </summary>
    [Required]
    public List<LinkBackgroundMusicItem> Musics { get; set; } = new();
}
