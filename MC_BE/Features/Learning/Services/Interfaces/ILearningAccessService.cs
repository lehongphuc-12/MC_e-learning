namespace MC_BE.Features.Learning.Services.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện dịch vụ kiểm soát điều kiện truy cập và mở khóa nội dung học tập.
/// </summary>
public interface ILearningAccessService
{
    /// <summary>Kiểm tra xem học viên có được phép mở xem nội dung của một bài học cụ thể hay không.</summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học muốn truy cập.</param>
    /// <returns>(Allowed, Reason) - Cờ cho phép và chuỗi giải thích thân thiện với người dùng.</returns>
    Task<(bool Allowed, string? Reason)> CheckLessonAsync(int learnerId, int lessonId);
    /// <summary>Kiểm tra xem học viên có được phép làm bài trắc nghiệm (Quiz) hay không.</summary>
    /// Yêu cầu học viên phải ghi danh khóa học và hoàn thành các bài học trước quiz đó.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="quizId">ID bài trắc nghiệm.</param>
    /// <returns>(Allowed, Reason).</returns>
    Task<(bool Allowed, string? Reason)> CheckQuizAsync(int learnerId, int quizId);
    /// <summary>Kiểm tra xem học viên đã đủ điều kiện để nhận chứng chỉ của khóa học hay chưa.</summary>
    /// Đòi hỏi hoàn thành 100% bài học và vượt qua tất cả bài tập đánh giá bắt buộc (Chương và Cuối khóa).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>(Allowed, Reason).</returns>
    Task<(bool Allowed, string? Reason)> CheckCertificateAsync(int learnerId, int courseId);
    /// <summary>Tính toán ma trận trạng thái khóa cho toàn bộ bài học trong một khóa học.</summary>
    ///   Nếu value là null nghĩa là bài học đó đang ở trạng thái Mở (Unlocked).
    /// - Tra cứu O(1) theo LessonId giúp Frontend dễ dàng render trạng thái ổ khóa cho từng bài học trên cây lộ trình khóa học.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Từ điển [LessonId, ReasonLocked].</returns>
    Task<Dictionary<int, string?>> GetLessonLocksAsync(int learnerId, int courseId);
}
