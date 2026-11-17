// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Interface (Business Logic Layer - Progress Tracking).
// - Nằm trong module: Features/Learning/Services/Interfaces.
// - Vai trò: Định nghĩa các nghiệp vụ theo dõi, cập nhật tiến độ học tập (Progress Tracking),
//   chuỗi ngày học liên tục (Streak), và nhật ký hoạt động (Recent Activities) của học viên.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Theo dõi chi tiết tiến trình học của học viên ở cấp độ Bài học (LessonProgress) và Khóa học (Enrollment).
// - Lưu nhớ vị trí dừng video (LastPositionSeconds) để học viên học tiếp lần sau không bị gián đoạn.
// - Tự động tính toán lại tỷ lệ hoàn thành khóa học (CompletionPercentage) và tự động kích hoạt cấp chứng chỉ
//   khi đạt 100%.
// - Thúc đẩy tinh thần học tập qua Gamification (Learning Streak) và Bảng dòng thời gian hoạt động.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: LearningController (api/learning/...).
// - Triển khai: LearningProgressService.
// - Tương tác nội bộ: ICertificateService (kích hoạt cấp chứng chỉ), SmartMcDbContext / Repositories.
// ====================================================================================================

using MC_BE.Features.Learning.DTOs;

namespace MC_BE.Features.Learning.Services.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện dịch vụ nghiệp vụ quản lý tiến độ học tập và các chỉ số Gamification của học viên.
/// [Giải phẫu cú pháp]:
/// - `public`: Công khai toàn hệ thống.
/// - `interface`: Khai báo hợp đồng dịch vụ.
/// - `ILearningProgressService`: Tên giao diện chuẩn convention C#.
/// </summary>
public interface ILearningProgressService
{
    /// <summary>
    /// [Dòng này làm gì]: Lấy toàn bộ thông tin tiến độ học tập của học viên trong một khóa học cụ thể.
    /// Bao gồm % hoàn thành, số bài đã xong, và chi tiết từng bài học con.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<CourseLearningProgressDto?>`: Nullable DTO, trả về null nếu học viên chưa ghi danh khóa học.
    /// - `int learnerId`: ID học viên.
    /// - `int courseId`: ID khóa học.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>CourseLearningProgressDto hoặc null nếu học viên chưa ghi danh khóa học.</returns>
    Task<CourseLearningProgressDto?> GetCourseProgressAsync(int learnerId, int courseId);

    /// <summary>
    /// [Dòng này làm gì]: Cập nhật tiến độ của một bài học (đánh dấu hoàn thành, lưu vị trí video, thời gian học).
    /// Tự động cập nhật lại tổng tiến độ khóa học và cấp chứng chỉ nếu đạt 100%.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên.
    /// - `int lessonId`: ID bài học đang xem.
    /// - `UpdateLessonProgressRequest request`: DTO chứa thông tin heartbeat từ video player (LastPositionSeconds, TimeSpentSeconds, IsCompleted).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="request">Dữ liệu cập nhật tiến độ gửi từ video player.</param>
    /// <returns>CourseLearningProgressDto mới nhất sau khi cập nhật.</returns>
    Task<CourseLearningProgressDto?> UpdateLessonProgressAsync(int learnerId, int lessonId, UpdateLessonProgressRequest request);

    /// <summary>
    /// [Dòng này làm gì]: Lấy danh sách các hoạt động học tập gần đây nhất của học viên để hiển thị trên Dashboard.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên.
    /// - `int limit = 10`: Tham số tùy chọn có giá trị mặc định là 10 bản ghi.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="limit">Số lượng hoạt động tối đa cần lấy (mặc định 10).</param>
    /// <returns>Danh sách ActivityLogDto.</returns>
    Task<List<ActivityLogDto>> GetRecentActivitiesAsync(int learnerId, int limit = 10);

    /// <summary>
    /// [Dòng này làm gì]: Tính toán và lấy chỉ số chuỗi ngày học liên tục (Learning Streak) của học viên theo múi giờ Việt Nam (UTC+7).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<LearningStreakDto>`: DTO chứa CurrentStreak và LongestStreak.
    /// - `int learnerId`: ID học viên.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>LearningStreakDto chứa CurrentStreak và LongestStreak.</returns>
    Task<LearningStreakDto> GetLearningStreakAsync(int learnerId);
}
