// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định nghĩa mô hình truyền tải tiến độ học tập giữa Client và Backend.
//   Hỗ trợ theo dõi tiến trình của từng bài học và toàn bộ khóa học.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cung cấp dữ liệu chi tiết về % hoàn thành khóa học, số bài học đã học/tổng số bài.
// - Ghi nhận trạng thái hoàn thành bài học, vị trí dừng video phát dở (LastPositionSeconds),
//   và tổng thời gian học viên đã bỏ ra (TimeSpentSeconds) để tính toán streak & phân tích hành vi.
// - Kích hoạt điều kiện cấp chứng chỉ khi tiến độ đạt 100%.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client Player: Gửi sự kiện định kỳ (heartbeat) hoặc khi xem hết video tới LearningController -> UpdateLessonProgress.
// - Service: LearningProgressService xử lý logic cập nhật bảng LessonProgress, tính lại % hoàn thành khóa học trên Enrollment.
// - Database: Bảng LessonProgress, Enrollments, Lessons, Courses.
// ====================================================================================================

using System;
using System.Collections.Generic;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO tổng hợp tiến độ học tập của một học viên trong toàn bộ một khóa học cụ thể.
/// </summary>
public class CourseLearningProgressDto
{
    /// <summary>
    /// ID của khóa học đang theo dõi tiến độ.
    /// </summary>
    public int CourseId { get; set; }

    /// <summary>
    /// Tiêu đề của khóa học.
    /// </summary>
    public string CourseTitle { get; set; } = string.Empty;

    /// <summary>
    /// ID của bản ghi ghi danh (EnrollmentId) của học viên với khóa học.
    /// </summary>
    public int EnrollmentId { get; set; }

    /// <summary>
    /// Phần trăm tiến độ hoàn thành khóa học (0.00% - 100.00%), được tính tự động dựa trên số bài học đã hoàn thành.
    /// </summary>
    public decimal CompletionPercentage { get; set; }

    /// <summary>
    /// Cờ xác định học viên đã hoàn thành 100% nội dung khóa học hay chưa.
    /// </summary>
    public bool IsCompleted { get; set; }

    /// <summary>
    /// Số lượng bài học học viên đã hoàn thành (IsCompleted = true).
    /// </summary>
    public int CompletedLessonsCount { get; set; }

    /// <summary>
    /// Tổng số lượng bài học đang có hiệu lực trong khóa học.
    /// </summary>
    public int TotalLessonsCount { get; set; }

    /// <summary>
    /// ID chứng chỉ đã được cấp (nếu đã hoàn thành và hệ thống đã phát hành chứng chỉ).
    /// </summary>
    public int? CertificateId { get; set; }

    /// <summary>
    /// Mã chứng chỉ duy nhất để tra cứu (nếu có).
    /// </summary>
    public string? CertificateCode { get; set; }

    /// <summary>
    /// Danh sách chi tiết tiến độ của từng bài học trong khóa học.
    /// </summary>
    public List<LessonProgressDto> LessonProgresses { get; set; } = new();
}

/// <summary>
/// DTO biểu diễn tiến độ học tập chi tiết của học viên đối với một bài học đơn lẻ.
/// </summary>
public class LessonProgressDto
{
    /// <summary>
    /// ID bài học tương ứng (LessonId).
    /// </summary>
    public int LessonId { get; set; }

    /// <summary>
    /// Đánh dấu bài học này đã được học viên hoàn thành hay chưa.
    /// </summary>
    public bool IsCompleted { get; set; }

    /// <summary>
    /// Thời điểm học viên dừng lại ở lần xem gần nhất (tính bằng giây), hỗ trợ tính năng Resume Video.
    /// </summary>
    public int LastPositionSeconds { get; set; }

    /// <summary>
    /// Tổng số giây học viên đã tương tác/học bài học này.
    /// </summary>
    public int TimeSpentSeconds { get; set; }

    /// <summary>
    /// Tổng thời gian học chuyển đổi sang phút để tiện hiển thị trên báo cáo UI.
    /// </summary>
    public int TimeSpentMinutes { get; set; }

    /// <summary>
    /// Thời điểm gần nhất học viên truy cập/học bài này.
    /// </summary>
    public DateTime? LastAccessedAt { get; set; }

    /// <summary>
    /// Thời điểm học viên bấm nút hoặc thỏa mãn điều kiện hoàn thành bài học.
    /// </summary>
    public DateTime? CompletedAt { get; set; }
}

/// <summary>
/// DTO chứa dữ liệu yêu cầu cập nhật tiến độ học của một bài học từ Client player gửi lên.
/// </summary>
public class UpdateLessonProgressRequest
{
    /// <summary>
    /// Cờ đánh dấu hoàn thành bài học (true nếu hoàn thành). Null nếu chỉ muốn cập nhật vị trí xem video.
    /// </summary>
    public bool? IsCompleted { get; set; }

    /// <summary>
    /// Vị trí phát video hiện tại (giây). Dùng để ghi nhớ để lần sau người dùng xem tiếp.
    /// </summary>
    public int? LastPositionSeconds { get; set; }

    /// <summary>
    /// Số giây tích lũy tăng thêm kể từ lần gửi tín hiệu gần nhất (heartbeat increment) hoặc tổng thời lượng mới.
    /// </summary>
    public int? TimeSpentSeconds { get; set; }
}
