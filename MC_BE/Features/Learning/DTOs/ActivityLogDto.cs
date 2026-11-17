// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture / N-Tier).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định hình cấu trúc dữ liệu truyền tải (Contract) giữa Backend và Frontend (Client)
//   nhằm hiển thị dòng thời gian nhật ký học tập (Learning Activity Timeline / Recent Activities) của học viên.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Trả về danh sách hoạt động học tập gần nhất của học sinh trên Dashboard cá nhân (ví dụ: "Đã hoàn thành bài học X",
//   "Đã nộp bài Speaking Y", "Đạt chứng chỉ Z").
// - Thiết kế sẵn các trường trực quan hóa (Emoji, Accent, Time hiển thị tương đối) giúp Client hiển thị ngay
//   mà không cần xử lý định dạng phức tạp.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Database: Bảng LessonProgress, SpeakingSubmissions, Certificates.
// - Service: LearningProgressService (hàm GetRecentActivitiesAsync) tổng hợp dữ liệu từ DB -> map sang ActivityLogDto.
// - Controller: LearningController -> HTTP GET api/learning/recent-activities.
// - Client: Nhận JSON array của ActivityLogDto để render danh sách hoạt động trên giao diện Learning Dashboard.
// ====================================================================================================

using System;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// Data Transfer Object đại diện cho một mẩu tin nhật ký hoạt động học tập gần đây của người dùng.
/// </summary>
public class ActivityLogDto
{
    /// <summary>
    /// Biểu tượng cảm xúc trực quan hóa cho loại hoạt động (ví dụ: 🎯 cho hoàn thành bài học, 🎤 cho nộp bài nói).
    /// Giúp giao diện sinh động và tăng trải nghiệm người dùng (UX).
    /// </summary>
    public string Emoji { get; set; } = string.Empty;

    /// <summary>
    /// Nội dung mô tả chi tiết của hoạt động (ví dụ: "Đã hoàn thành bài học: Giới thiệu phát âm").
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Chuỗi thời gian đã được định dạng hiển thị tương đối (ví dụ: "2 giờ trước", "Hôm qua") để Client hiển thị trực tiếp.
    /// </summary>
    public string Time { get; set; } = string.Empty;

    /// <summary>
    /// Mã màu nhấn (Accent color class / hex code) hỗ trợ CSS frontend (ví dụ: "text-emerald-500", "text-blue-500")
    /// phân biệt loại hoạt động theo trạng thái.
    /// </summary>
    public string Accent { get; set; } = string.Empty;

    /// <summary>
    /// Đường dẫn điều hướng trực tiếp (deep link) tới tài nguyên liên quan (bài học, bài nộp, chứng chỉ).
    /// Cho phép null nếu hoạt động không có trang đích cụ thể.
    /// </summary>
    public string? Link { get; set; }

    /// <summary>
    /// Thời điểm chính xác hoạt động diễn ra theo múi giờ UTC, dùng để sắp xếp (sorting) trên backend hoặc format lại ở client.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
