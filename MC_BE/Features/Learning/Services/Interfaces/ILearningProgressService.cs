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
/// Giao diện dịch vụ nghiệp vụ quản lý tiến độ học tập và các chỉ số Gamification của học viên.
/// </summary>
public interface ILearningProgressService
{
    /// <summary>
    /// Lấy toàn bộ thông tin tiến độ học tập của học viên trong một khóa học cụ thể.
    /// Bao gồm % hoàn thành, số bài đã xong, và chi tiết từng bài học con.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>CourseLearningProgressDto hoặc null nếu học viên chưa ghi danh khóa học.</returns>
    Task<CourseLearningProgressDto?> GetCourseProgressAsync(int learnerId, int courseId);

    /// <summary>
    /// Cập nhật tiến độ của một bài học (đánh dấu hoàn thành, lưu vị trí video, thời gian học).
    /// Tự động cập nhật lại tổng tiến độ khóa học và cấp chứng chỉ nếu đạt 100%.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="request">Dữ liệu cập nhật tiến độ gửi từ video player.</param>
    /// <returns>CourseLearningProgressDto mới nhất sau khi cập nhật.</returns>
    Task<CourseLearningProgressDto?> UpdateLessonProgressAsync(int learnerId, int lessonId, UpdateLessonProgressRequest request);

    /// <summary>
    /// Lấy danh sách các hoạt động học tập gần đây nhất của học viên để hiển thị trên Dashboard.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="limit">Số lượng hoạt động tối đa cần lấy (mặc định 10).</param>
    /// <returns>Danh sách ActivityLogDto.</returns>
    Task<List<ActivityLogDto>> GetRecentActivitiesAsync(int learnerId, int limit = 10);

    /// <summary>
    /// Tính toán và lấy chỉ số chuỗi ngày học liên tục (Learning Streak) của học viên.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>LearningStreakDto chứa CurrentStreak và LongestStreak.</returns>
    Task<LearningStreakDto> GetLearningStreakAsync(int learnerId);
}
