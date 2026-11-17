// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Interface (Business Logic Layer - Speaking Submissions).
// - Nằm trong module: Features/Learning/Services/Interfaces.
// - Vai trò: Định nghĩa toàn bộ nghiệp vụ nộp bài tập nói, tra cứu lịch sử làm bài và quy trình
//   chấm điểm/đánh giá (Grading Workflow) bài thi Speaking của học viên.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Thực hiện nộp bài nói kèm kiểm tra nghiêm ngặt: Quyền truy cập khóa học, trạng thái nộp bài gần nhất
//   (chống nộp đè khi đang chờ chấm hoặc đã đạt >= 80).
// - Quản lý upload file âm thanh an toàn lên Cloudinary.
// - Cung cấp danh sách bài nộp phân quyền theo vai trò: Học viên chỉ thấy bài của mình, Giảng viên chỉ thấy
//   bài của các khóa mình dạy, Admin thấy toàn bộ.
// - Quy trình chấm bài: Giảng viên cho điểm, nhập nhận xét, hệ thống lưu lại người chấm và thời điểm chấm.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: SpeakingSubmissionsController.
// - Triển khai: SpeakingSubmissionService.
// - Repositories & Services: ISpeakingSubmissionRepository, ISpeakingScriptRepository,
//   ICourseAccessControlService, ICloudinaryService, UnitOfWork / DbContext.
// ====================================================================================================

using MC_BE.Features.Learning.DTOs;

namespace MC_BE.Features.Learning.Services.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện dịch vụ nghiệp vụ nộp và chấm điểm bài tập nói (Speaking Submissions).
/// [Giải phẫu cú pháp]:
/// - `public`: Công khai toàn hệ thống.
/// - `interface`: Hợp đồng dịch vụ.
/// - `ISpeakingSubmissionService`: Tên giao diện chuẩn convention C#.
/// </summary>
public interface ISpeakingSubmissionService
{
    /// <summary>
    /// [Dòng này làm gì]: Học viên nộp bài tập nói (file audio + ghi chú) theo LessonId hoặc ScriptId.
    /// Tự động kiểm tra quyền truy cập khóa học, kiểm tra điều kiện khóa nộp bài và upload file lên Cloudinary.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên nộp bài.
    /// - `CreateSpeakingSubmissionRequest request`: DTO chứa AudioFile (IFormFile), LessonId, ScriptId, Note.
    /// - `Task<SpeakingSubmissionResponseDto>`: Trả về DTO kết quả bài nộp vừa tạo hoặc ghi đè.
    /// </summary>
    /// <param name="learnerId">ID học viên nộp bài.</param>
    /// <param name="request">Dữ liệu nộp bài (file audio, lessonId, scriptId, note).</param>
    /// <returns>SpeakingSubmissionResponseDto chứa thông tin bài nộp mới tạo.</returns>
    Task<SpeakingSubmissionResponseDto> SubmitSpeakingAssignmentAsync(int learnerId, CreateSpeakingSubmissionRequest request);

    /// <summary>
    /// [Dòng này làm gì]: Lấy bài nộp mới nhất của học viên đối với một bài học cụ thể.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên.
    /// - `int lessonId`: ID bài học.
    /// - `Task<SpeakingSubmissionResponseDto?>`: Nullable DTO, trả về null nếu học viên chưa từng nộp bài cho bài học này.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Bài nộp mới nhất hoặc null.</returns>
    Task<SpeakingSubmissionResponseDto?> GetLatestSubmissionByLessonAsync(int learnerId, int lessonId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy bài nộp mới nhất của học viên đối với một kịch bản nói cụ thể (bài thi Final hoặc Chapter).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên.
    /// - `int scriptId`: ID kịch bản nói.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Bài nộp mới nhất hoặc null.</returns>
    Task<SpeakingSubmissionResponseDto?> GetLatestSubmissionByScriptAsync(int learnerId, int scriptId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy toàn bộ danh sách các bài nộp luyện nói của học viên hiện tại.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên.
    /// - `Task<IEnumerable<SpeakingSubmissionResponseDto>>`: Danh sách bài nộp của học viên sắp xếp theo ngày nộp giảm dần.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách bài nộp của học viên.</returns>
    Task<IEnumerable<SpeakingSubmissionResponseDto>> GetMySubmissionsAsync(int learnerId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy danh sách các bài nộp cần chấm thuộc tất cả các khóa học do giảng viên này phụ trách.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int instructorId`: ID giảng viên để kiểm tra quyền sở hữu khóa học.
    /// </summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Danh sách bài nộp chờ chấm hoặc đã chấm.</returns>
    Task<IEnumerable<SpeakingSubmissionResponseDto>> GetSubmissionsForInstructorAsync(int instructorId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy danh sách các bài nộp trong một khóa học cụ thể dành cho giảng viên phụ trách khóa học đó.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int instructorId`: ID giảng viên.
    /// - `int courseId`: ID khóa học.
    /// </summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách bài nộp thuộc khóa học.</returns>
    Task<IEnumerable<SpeakingSubmissionResponseDto>> GetSubmissionsByCourseForInstructorAsync(int instructorId, int courseId);

    /// <summary>
    /// [Dòng này làm gì]: Giảng viên thực hiện chấm điểm và viết lời nhận xét góp ý cho một bài nộp cụ thể.
    /// Kiểm tra quyền giảng viên của khóa học trước khi cập nhật điểm.
    /// Tự động cập nhật hoàn thành bài học (LessonProgress.IsCompleted = true) nếu điểm đạt chuẩn (Score >= 80).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int instructorId`: ID giảng viên chấm bài.
    /// - `int submissionId`: ID bài nộp cần chấm.
    /// - `GradeSpeakingSubmissionRequest request`: DTO chứa điểm số (Score) và nhận xét (Feedback).
    /// - `Task<SpeakingSubmissionResponseDto?>`: Bài nộp sau khi chấm hoặc null nếu không tìm thấy.
    /// </summary>
    /// <param name="instructorId">ID giảng viên chấm điểm.</param>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <param name="request">Điểm số (0-100) và lời nhận xét (feedback).</param>
    /// <returns>SpeakingSubmissionResponseDto sau khi chấm điểm thành công.</returns>
    Task<SpeakingSubmissionResponseDto?> GradeSubmissionAsync(int instructorId, int submissionId, GradeSpeakingSubmissionRequest request);
}
