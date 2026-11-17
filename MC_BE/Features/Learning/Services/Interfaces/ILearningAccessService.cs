// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Interface (Business Logic Layer - Access Control).
// - Nằm trong module: Features/Learning/Services/Interfaces.
// - Vai trò: Đóng vai trò là "Người gác cổng" (Gatekeeper / Policy Engine) kiểm soát điều kiện tiên quyết
//   (Prerequisites) và quyền truy cập vào từng tài nguyên học tập: Bài học (Lesson), Trắc nghiệm (Quiz),
//   Chứng chỉ (Certificate).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Thực thi logic học tuần tự (Sequential Learning):
//   1. Bài học đầu tiên luôn mở.
//   2. Bài học thứ N chỉ mở khi bài học N-1 đã hoàn thành (IsCompleted = true).
//   3. Nếu bài học trước có bài tập Speaking thì phải có bài nộp đạt điểm chuẩn (Score >= 80).
//   4. Nếu bài học trước có bài trắc nghiệm (Quiz) thì phải vượt qua Quiz.
// - Cung cấp danh sách trạng thái khóa của toàn bộ các bài học trong khóa học để Frontend hiển thị icon Ổ khóa (Lock).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: LearningController, QuizzesController.
// - Triển khai: LearningAccessService.
// - Được gọi bởi: CertificateService, LearningProgressService.
// ====================================================================================================

namespace MC_BE.Features.Learning.Services.Interfaces;

/// <summary>
/// Giao diện dịch vụ kiểm soát điều kiện truy cập và mở khóa nội dung học tập.
/// </summary>
public interface ILearningAccessService
{
    /// <summary>
    /// Kiểm tra xem học viên có được phép mở xem nội dung của một bài học cụ thể hay không.
    /// Trả về tuple: Allowed (true/false) và Reason (Lý do bị khóa nếu Allowed = false).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học muốn truy cập.</param>
    /// <returns>(Allowed, Reason) - Cờ cho phép và chuỗi giải thích thân thiện với người dùng.</returns>
    Task<(bool Allowed, string? Reason)> CheckLessonAsync(int learnerId, int lessonId);

    /// <summary>
    /// Kiểm tra xem học viên có được phép làm bài trắc nghiệm (Quiz) hay không.
    /// Yêu cầu học viên phải ghi danh khóa học và hoàn thành các bài học trước quiz đó.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="quizId">ID bài trắc nghiệm.</param>
    /// <returns>(Allowed, Reason).</returns>
    Task<(bool Allowed, string? Reason)> CheckQuizAsync(int learnerId, int quizId);

    /// <summary>
    /// Kiểm tra xem học viên đã đủ điều kiện để nhận chứng chỉ của khóa học hay chưa.
    /// Đòi hỏi hoàn thành 100% bài học và vượt qua tất cả bài tập đánh giá bắt buộc.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>(Allowed, Reason).</returns>
    Task<(bool Allowed, string? Reason)> CheckCertificateAsync(int learnerId, int courseId);

    /// <summary>
    /// Tính toán ma trận trạng thái khóa cho toàn bộ bài học trong một khóa học.
    /// Trả về Dictionary ánh xạ LessonId -> Reason bị khóa (null nếu bài học đó đã được mở).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Từ điển [LessonId, ReasonLocked].</returns>
    Task<Dictionary<int, string?>> GetLessonLocksAsync(int learnerId, int courseId);
}
