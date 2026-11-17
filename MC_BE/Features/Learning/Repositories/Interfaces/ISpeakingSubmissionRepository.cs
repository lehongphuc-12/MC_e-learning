// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Repository Interface (Hợp đồng tầng lưu trữ) trong Repository Pattern.
// - Nằm trong module: Features/Learning/Repositories/Interfaces.
// - Kế thừa từ: IGenericRepository<SpeakingSubmission>.
// - Vai trò: Định nghĩa các giao thức truy vấn dữ liệu cho các lượt nộp bài nói (SpeakingSubmission),
//   bao gồm thông tin người học, giảng viên phụ trách, điểm số, bài học và kịch bản liên quan.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Phục vụ luồng nộp bài và chấm bài: Lấy bài nộp theo học viên, theo giảng viên hướng dẫn của khóa học,
//   theo khóa học cụ thể.
// - Kiểm tra trạng thái nộp bài gần nhất (GetLatestByLearnerAndLessonAsync, GetLatestByLearnerAndScriptAsync)
//   để hỗ trợ logic nghiệp vụ: Khóa không cho nộp đè nếu bài trước đang chờ chấm ("PENDING") hoặc đã đạt (>= 80).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Được triển khai bởi: SpeakingSubmissionRepository.
// - Được inject vào: SpeakingSubmissionService, LearningAccessService.
// - Database Entity: SpeakingSubmission, kết nối với User, Lesson, SpeakingScript, Course.
// ====================================================================================================

using MC_BE.Core.Entities;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Repositories.Interfaces;

/// <summary>
/// Giao diện kho lưu trữ dữ liệu chuyên trách cho bài nộp Speaking (SpeakingSubmission).
/// </summary>
public interface ISpeakingSubmissionRepository : IGenericRepository<SpeakingSubmission>
{
    /// <summary>
    /// Lấy chi tiết một bài nộp cụ thể theo ID, nạp đầy đủ thông tin lồng nhau:
    /// Kịch bản -> Khóa học -> Giảng viên; Bài học -> Chương -> Khóa học; Thông tin học viên và người chấm.
    /// </summary>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <returns>Thực thể SpeakingSubmission chi tiết hoặc null.</returns>
    Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId);

    /// <summary>
    /// Lấy toàn bộ lịch sử các bài nộp luyện nói của một học viên cụ thể, sắp xếp theo thời gian nộp giảm dần.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách bài nộp của học viên.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAsync(int learnerId);

    /// <summary>
    /// Lấy danh sách các bài nộp thuộc các khóa học do giảng viên này phụ trách giảng dạy.
    /// Hỗ trợ cả 2 trường hợp: bài nộp gắn qua Lesson hoặc gán qua SpeakingScript.
    /// </summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Danh sách bài nộp cần giảng viên chấm điểm.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByInstructorAsync(int instructorId);

    /// <summary>
    /// Lấy toàn bộ bài nộp trong phạm vi một khóa học cụ thể.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách bài nộp thuộc khóa học.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByCourseAsync(int courseId);

    /// <summary>
    /// Lấy bản ghi nộp bài mới nhất của học viên đối với một bài học cụ thể.
    /// Dùng để kiểm tra trạng thái bài làm gần nhất (đã đạt chưa, có đang đợi chấm không).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Bài nộp mới nhất hoặc null nếu chưa nộp lần nào.</returns>
    Task<SpeakingSubmission?> GetLatestByLearnerAndLessonAsync(int learnerId, int lessonId);

    /// <summary>
    /// Lấy bản ghi nộp bài mới nhất của học viên đối với một kịch bản nói cụ thể (áp dụng cho bài thi cuối chương/khóa).
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Bài nộp mới nhất hoặc null.</returns>
    Task<SpeakingSubmission?> GetLatestByLearnerAndScriptAsync(int learnerId, int scriptId);
}
