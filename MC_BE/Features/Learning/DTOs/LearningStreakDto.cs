// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Đóng gói chỉ số chuỗi ngày học liên tục (Learning Streak) của học viên trả về cho Client.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Tạo động lực học tập (Gamification): Tính toán chuỗi ngày học tập liên tục không ngắt quãng (Current Streak)
//   và kỷ lục chuỗi ngày học dài nhất (Longest Streak).
// - Hiển thị biểu tượng ngọn lửa (Flame badge) trên Header/Dashboard kích thích học viên duy trì thói quen học mỗi ngày.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Database: Bảng LessonProgress (truy vấn các mốc LastAccessedAt phân nhóm theo ngày) hoặc bảng UserStreaks.
// - Service: LearningProgressService (hàm GetLearningStreakAsync).
// - Controller: LearningController -> HTTP GET api/learning/streak.
// - Client: Hiển thị icon ngọn lửa và con số streak bên cạnh avatar người dùng.
// ====================================================================================================

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO chứa thông tin chuỗi ngày học tập liên tiếp (Gamification Streak) của học viên.
/// </summary>
public class LearningStreakDto
{
    /// <summary>
    /// Số ngày học liên tiếp tính đến ngày hôm nay hoặc hôm qua. Nếu ngắt quãng quá 1 ngày sẽ reset về 0 hoặc 1.
    /// </summary>
    public int CurrentStreak { get; set; }

    /// <summary>
    /// Kỷ lục số ngày học liên tiếp dài nhất mà học viên từng đạt được trong toàn bộ quá trình học.
    /// </summary>
    public int LongestStreak { get; set; }
}
