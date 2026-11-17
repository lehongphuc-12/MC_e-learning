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
/// [Định nghĩa Interface]: Giao diện kho lưu trữ dữ liệu chuyên trách cho bài nộp Speaking (SpeakingSubmission).
/// [Giải phẫu cú pháp]:
/// - `public`: Phạm vi truy cập toàn hệ thống.
/// - `interface`: Khai báo giao diện hợp đồng.
/// - `ISpeakingSubmissionRepository`: Tên interface chuẩn convention C#.
/// - `: IGenericRepository<SpeakingSubmission>`: Thừa kế toàn bộ khả năng CRUD cơ sở cho bảng SpeakingSubmissions.
/// </summary>
public interface ISpeakingSubmissionRepository : IGenericRepository<SpeakingSubmission>
{
    /// <summary>
    /// [Dòng này làm gì]: Lấy chi tiết một bài nộp cụ thể theo ID, nạp đầy đủ thông tin lồng nhau:
    /// Kịch bản -> Khóa học -> Giảng viên; Bài học -> Chương -> Khóa học; Thông tin học viên và người chấm.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<SpeakingSubmission?>`: Trả về bài nộp hoàn chỉnh nạp sẵn navigation properties hoặc null nếu không tìm thấy.
    /// - `int submissionId`: Khóa chính SubmissionId của bài nộp.
    /// </summary>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <returns>Thực thể SpeakingSubmission chi tiết hoặc null.</returns>
    Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy toàn bộ lịch sử các bài nộp luyện nói của một học viên cụ thể, sắp xếp theo thời gian nộp giảm dần.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<IEnumerable<SpeakingSubmission>>`: Trả về danh sách bài nộp của học viên bất đồng bộ.
    /// - `int learnerId`: Khóa ngoại UserId của học viên trong bảng Users.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách bài nộp của học viên.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAsync(int learnerId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy danh sách các bài nộp thuộc các khóa học do giảng viên này phụ trách giảng dạy.
    /// Hỗ trợ cả 2 trường hợp: bài nộp gắn qua Lesson hoặc gán qua SpeakingScript.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int instructorId`: Khóa ngoại UserId của giảng viên trong bảng Users.
    /// [Tại sao dùng]: Phục vụ màn hình hàng đợi chấm bài (Grading Queue) của Giảng viên, đảm bảo phân quyền cách ly dữ liệu.
    /// </summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Danh sách bài nộp cần giảng viên chấm điểm.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByInstructorAsync(int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy toàn bộ bài nộp trong phạm vi một khóa học cụ thể.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int courseId`: Khóa ngoại CourseId của khóa học.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách bài nộp thuộc khóa học.</returns>
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByCourseAsync(int courseId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy bản ghi nộp bài mới nhất của học viên đối với một bài học cụ thể.
    /// Dùng để kiểm tra trạng thái bài làm gần nhất (đã đạt chưa, có đang đợi chấm không).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên.
    /// - `int lessonId`: ID bài học.
    /// [Tại sao dùng]: Cốt lõi của logic "Khóa nộp bài thông minh" (Resubmission Lock): Nếu bài nộp gần nhất đang chờ chấm hoặc đã đạt >= 80 điểm thì khóa không cho nộp đè.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Bài nộp mới nhất hoặc null nếu chưa nộp lần nào.</returns>
    Task<SpeakingSubmission?> GetLatestByLearnerAndLessonAsync(int learnerId, int lessonId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy bản ghi nộp bài mới nhất của học viên đối với một kịch bản nói cụ thể (áp dụng cho bài thi cuối chương/khóa).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên.
    /// - `int scriptId`: ID kịch bản nói.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Bài nộp mới nhất hoặc null.</returns>
    Task<SpeakingSubmission?> GetLatestByLearnerAndScriptAsync(int learnerId, int scriptId);
}
