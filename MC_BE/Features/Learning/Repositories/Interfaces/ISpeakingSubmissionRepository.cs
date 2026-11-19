
using MC_BE.Core.Entities;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Repositories.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện kho lưu trữ dữ liệu chuyên trách cho bài nộp Speaking (SpeakingSubmission).
/// </summary>
public interface ISpeakingSubmissionRepository : IGenericRepository<SpeakingSubmission>
{
    /// <summary>Lấy chi tiết một bài nộp cụ thể theo ID, nạp đầy đủ thông tin lồng nhau:.</summary>
    /// Kịch bản -> Khóa học -> Giảng viên; Bài học -> Chương -> Khóa học; Thông tin học viên và người chấm.
    /// </summary>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <returns>Thực thể SpeakingSubmission chi tiết hoặc null.</returns>
    Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId);
    /// <summary>Lấy toàn bộ lịch sử các bài nộp luyện nói của một học viên cụ thể, sắp xếp theo thời gian nộp giảm dần.</summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách bài nộp của học viên.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAsync(int learnerId);
    /// <summary>Lấy danh sách các bài nộp thuộc các khóa học do giảng viên này phụ trách giảng dạy.</summary>
    /// Hỗ trợ cả 2 trường hợp: bài nộp gắn qua Lesson hoặc gán qua SpeakingScript.
    /// </summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Danh sách bài nộp cần giảng viên chấm điểm.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByInstructorAsync(int instructorId);
    /// <summary>Lấy toàn bộ bài nộp trong phạm vi một khóa học cụ thể.</summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách bài nộp thuộc khóa học.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByCourseAsync(int courseId);
    /// <summary>Lấy bản ghi nộp bài mới nhất của học viên đối với một bài học cụ thể.</summary>
    /// Dùng để kiểm tra trạng thái bài làm gần nhất (đã đạt chưa, có đang đợi chấm không).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Bài nộp mới nhất hoặc null nếu chưa nộp lần nào.</returns>
    Task<SpeakingSubmission?> GetLatestByLearnerAndLessonAsync(int learnerId, int lessonId);
    /// <summary>Lấy bản ghi nộp bài mới nhất của học viên đối với một kịch bản nói cụ thể (áp dụng cho bài thi cuối chương/khóa).</summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Bài nộp mới nhất hoặc null.</returns>
    Task<SpeakingSubmission?> GetLatestByLearnerAndScriptAsync(int learnerId, int scriptId);

    /// <summary>
    /// Lấy toàn bộ lịch sử các lần nộp bài nói của một học viên cho một kịch bản nói, sắp xếp theo thời gian nộp.
    /// </summary>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAndScriptAsync(int learnerId, int scriptId);

    /// <summary>
    /// Lấy toàn bộ lịch sử các lần nộp bài nói của một học viên cho một bài học, sắp xếp theo thời gian nộp.
    /// </summary>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAndLessonAsync(int learnerId, int lessonId);
}
