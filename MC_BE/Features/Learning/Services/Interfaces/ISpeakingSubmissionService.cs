
using MC_BE.Features.Learning.DTOs;

namespace MC_BE.Features.Learning.Services.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện dịch vụ nghiệp vụ nộp và chấm điểm bài tập nói (Speaking Submissions).
/// </summary>
public interface ISpeakingSubmissionService
{
    /// <summary>Học viên nộp bài tập nói (file audio + ghi chú) theo LessonId hoặc ScriptId.</summary>
    /// Tự động kiểm tra quyền truy cập khóa học, kiểm tra điều kiện khóa nộp bài và upload file lên Cloudinary.
    /// </summary>
    /// <param name="learnerId">ID học viên nộp bài.</param>
    /// <param name="request">Dữ liệu nộp bài (file audio, lessonId, scriptId, note).</param>
    /// <returns>SpeakingSubmissionResponseDto chứa thông tin bài nộp mới tạo.</returns>
    Task<SpeakingSubmissionResponseDto> SubmitSpeakingAssignmentAsync(int learnerId, CreateSpeakingSubmissionRequest request);
    /// <summary>Lấy bài nộp mới nhất của học viên đối với một bài học cụ thể.</summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Bài nộp mới nhất hoặc null.</returns>
    Task<SpeakingSubmissionResponseDto?> GetLatestSubmissionByLessonAsync(int learnerId, int lessonId);
    /// <summary>Lấy bài nộp mới nhất của học viên đối với một kịch bản nói cụ thể (bài thi Final hoặc Chapter).</summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>Bài nộp mới nhất hoặc null.</returns>
    Task<SpeakingSubmissionResponseDto?> GetLatestSubmissionByScriptAsync(int learnerId, int scriptId);
    /// <summary>Lấy toàn bộ danh sách các bài nộp luyện nói của học viên hiện tại.</summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách bài nộp của học viên.</returns>
    Task<IEnumerable<SpeakingSubmissionResponseDto>> GetMySubmissionsAsync(int learnerId);
    /// <summary>Lấy danh sách các bài nộp cần chấm thuộc tất cả các khóa học do giảng viên này phụ trách.</summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <returns>Danh sách bài nộp chờ chấm hoặc đã chấm.</returns>
    Task<IEnumerable<SpeakingSubmissionResponseDto>> GetSubmissionsForInstructorAsync(int instructorId);
    /// <summary>Lấy danh sách các bài nộp trong một khóa học cụ thể dành cho giảng viên phụ trách khóa học đó.</summary>
    /// <param name="instructorId">ID giảng viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>Danh sách bài nộp thuộc khóa học.</returns>
    Task<IEnumerable<SpeakingSubmissionResponseDto>> GetSubmissionsByCourseForInstructorAsync(int instructorId, int courseId);
    /// <summary>Giảng viên thực hiện chấm điểm và viết lời nhận xét góp ý cho một bài nộp cụ thể.</summary>
    /// Kiểm tra quyền giảng viên của khóa học trước khi cập nhật điểm.
    /// Tự động cập nhật hoàn thành bài học (LessonProgress.IsCompleted = true) nếu điểm đạt chuẩn (Score >= 80).
    /// </summary>
    /// <param name="instructorId">ID giảng viên chấm điểm.</param>
    /// <param name="submissionId">ID bài nộp.</param>
    /// <param name="request">Điểm số (0-100) và lời nhận xét (feedback).</param>
    /// <returns>SpeakingSubmissionResponseDto sau khi chấm điểm thành công.</returns>
    Task<SpeakingSubmissionResponseDto?> GradeSubmissionAsync(int instructorId, int submissionId, GradeSpeakingSubmissionRequest request);

    /// <summary>
    /// Lấy chi tiết bài nộp theo ID cho học viên (chính chủ) hoặc giảng viên/admin.
    /// </summary>
    Task<SpeakingSubmissionResponseDto?> GetSubmissionByIdAsync(int submissionId, int userId, bool isInstructorOrAdmin);

    /// <summary>
    /// Lấy toàn bộ lịch sử các lần nộp bài của học viên cho một kịch bản nói.
    /// </summary>
    Task<IEnumerable<SpeakingSubmissionHistoryDto>> GetSubmissionHistoryByScriptAsync(int learnerId, int scriptId);

    /// <summary>
    /// Lấy toàn bộ lịch sử các lần nộp bài của học viên cho một bài học.
    /// </summary>
    Task<IEnumerable<SpeakingSubmissionHistoryDto>> GetSubmissionHistoryByLessonAsync(int learnerId, int lessonId);
}
