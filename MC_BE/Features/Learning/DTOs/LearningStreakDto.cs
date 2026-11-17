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
// - Database: Bảng LessonProgress (truy vấn các mốc LastAccessedAt/CompletedAt phân nhóm theo ngày lịch UTC+7).
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
    // [Dòng này làm gì]: Lưu số ngày học liên tiếp hiện tại tính đến thời điểm hôm nay hoặc hôm qua.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Cho phép truy cập công khai từ bên ngoài.
    //   - `int`: Kiểu số nguyên 32-bit (System.Int32).
    //   - `CurrentStreak`: Tên thuộc tính số ngày liên tiếp hiện tại.
    //   - `{ get; set; }`: Cung cấp accessor đọc và ghi giá trị.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Phục vụ logic Gamification: nếu học viên bỏ bẵng quá 1 ngày (khoảng cách giữa hôm nay và ngày học gần nhất > 1 ngày), giá trị này tự động bị reset về 0 để thúc đẩy học viên vào học đều đặn.
    // [Cách viết thay thế & So sánh]: Dùng kiểu `int` là tối ưu vì số ngày streak thực tế của con người chỉ dao động từ vài ngày đến vài trăm ngày.
    public int CurrentStreak { get; set; }

    // [Dòng này làm gì]: Lưu kỷ lục số ngày học liên tiếp dài nhất mà học viên từng đạt được trong toàn bộ lịch sử học tập.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Cho phép truy cập công khai.
    //   - `int`: Kiểu số nguyên 32-bit.
    //   - `LongestStreak`: Tên thuộc tính kỷ lục chuỗi ngày.
    //   - `{ get; set; }`: Getter/Setter.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Giúp lưu giữ thành tích cao nhất của học viên, khích lệ tâm lý tự hào ngay cả khi chuỗi hiện tại (`CurrentStreak`) vô tình bị đứt.
    public int LongestStreak { get; set; }
}
