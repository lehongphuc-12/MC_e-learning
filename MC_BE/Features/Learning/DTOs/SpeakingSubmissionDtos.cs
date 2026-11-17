// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định nghĩa dữ liệu truyền nhận cho nghiệp vụ Nộp bài nói (Speaking Submission)
//   và Chấm điểm/Đánh giá (Grading/Feedback) giữa Học viên, Giảng viên và Hệ thống.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Học viên gửi file ghi âm bài nói (.mp3, .wav) kèm ghi chú để nộp bài theo Lesson hoặc theo Script.
// - Giảng viên xem danh sách bài nộp, nghe audio, chấm điểm (thang 0-100) và viết nhận xét chi tiết.
// - Hệ thống tự động phân loại kết quả: Đạt/Không đạt (ngưỡng 80 điểm) và Xếp loại danh hiệu
//   (Xuất sắc: >=95, Giỏi: >=80, Cần cải thiện: >=50, Trung bình: >=30, Yếu: <30).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client: Gửi file audio multipart qua SpeakingSubmissionsController -> SpeakingSubmissionService.
// - Storage: Cloudinary tiếp nhận lưu trữ file âm thanh và trả về AudioUrl.
// - Database: Bảng SpeakingSubmissions, SpeakingScripts, Lessons, Users.
// ====================================================================================================

using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO chứa dữ liệu nộp bài nói từ học viên, bao gồm file ghi âm dạng nhị phân và ghi chú kèm theo.
/// </summary>
public class CreateSpeakingSubmissionRequest
{
    /// <summary>
    /// ID bài học liên kết (nộp bài nói thuộc phạm vi bài học). Cho phép null nếu nộp theo ScriptId độc lập.
    /// </summary>
    public int? LessonId { get; set; }

    /// <summary>
    /// ID kịch bản luyện nói liên kết. Cho phép null nếu nộp trực tiếp theo LessonId đã gắn kịch bản.
    /// </summary>
    public int? ScriptId { get; set; }

    /// <summary>
    /// File ghi âm phát âm/dẫn chương trình của học viên (.mp3 hoặc .wav). Bắt buộc phải có để chấm điểm.
    /// </summary>
    [Required(ErrorMessage = "Audio file (.mp3 or .wav) is required.")]
    public IFormFile AudioFile { get; set; } = null!;

    /// <summary>
    /// Lời nhắn hoặc ghi chú của học viên gửi tới giảng viên (ví dụ: "Em thử nói theo phong cách vui vẻ").
    /// </summary>
    public string? Note { get; set; }
}

/// <summary>
/// DTO chứa dữ liệu chấm điểm và nhận xét của giảng viên dành cho một bài nộp Speaking.
/// </summary>
public class GradeSpeakingSubmissionRequest
{
    /// <summary>
    /// Điểm số giảng viên đánh giá, giới hạn chặt chẽ trong thang điểm chuẩn từ 0 đến 100.
    /// </summary>
    [Range(0, 100, ErrorMessage = "Score must be between 0 and 100.")]
    public decimal Score { get; set; }

    /// <summary>
    /// Lời nhận xét, góp ý chi tiết về ngữ điệu, ngắt giọng, biểu cảm của giảng viên gửi tới học viên.
    /// </summary>
    public string? Feedback { get; set; }
}

/// <summary>
/// DTO trả về thông tin chi tiết một lượt nộp bài nói, bao gồm thông tin bài học, kịch bản,
/// file audio, điểm số, giảng viên chấm và phân hạng kết quả.
/// </summary>
public class SpeakingSubmissionResponseDto
{
    /// <summary>
    /// Mã định danh của lượt nộp bài (Primary Key).
    /// </summary>
    public int SubmissionId { get; set; }

    /// <summary>
    /// ID kịch bản liên quan.
    /// </summary>
    public int? ScriptId { get; set; }

    /// <summary>
    /// Tên kịch bản nói.
    /// </summary>
    public string? ScriptTitle { get; set; }

    /// <summary>
    /// Phạm vi đánh giá (LESSON, CHAPTER, FINAL). Mặc định là FINAL.
    /// </summary>
    public string Scope { get; set; } = "FINAL";

    /// <summary>
    /// ID bài học (nếu có).
    /// </summary>
    public int? LessonId { get; set; }

    /// <summary>
    /// Tiêu đề bài học tương ứng.
    /// </summary>
    public string LessonTitle { get; set; } = string.Empty;

    /// <summary>
    /// ID khóa học chứa bài tập nói này.
    /// </summary>
    public int CourseId { get; set; }

    /// <summary>
    /// Tên khóa học.
    /// </summary>
    public string CourseTitle { get; set; } = string.Empty;

    /// <summary>
    /// Đường dẫn thân thiện (slug) của khóa học phục vụ điều hướng trang web.
    /// </summary>
    public string? CourseSlug { get; set; }

    /// <summary>
    /// ID chương học (nếu có).
    /// </summary>
    public int? ModuleId { get; set; }

    /// <summary>
    /// Tiêu đề chương học.
    /// </summary>
    public string? ModuleTitle { get; set; }

    /// <summary>
    /// ID học viên nộp bài.
    /// </summary>
    public int LearnerId { get; set; }

    /// <summary>
    /// Họ và tên học viên.
    /// </summary>
    public string LearnerName { get; set; } = string.Empty;

    /// <summary>
    /// Email học viên.
    /// </summary>
    public string LearnerEmail { get; set; } = string.Empty;

    /// <summary>
    /// ID giảng viên phụ trách chấm bài này.
    /// </summary>
    public int InstructorId { get; set; }

    /// <summary>
    /// Họ tên giảng viên phụ trách.
    /// </summary>
    public string InstructorName { get; set; } = string.Empty;

    /// <summary>
    /// URL phát trực tiếp file ghi âm bài nộp lưu trên Cloudinary.
    /// </summary>
    public string AudioUrl { get; set; } = string.Empty;

    /// <summary>
    /// Ghi chú từ học viên khi nộp bài.
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// Trạng thái bài nộp ("PENDING" - Đang chờ chấm, "GRADED" - Đã chấm xong).
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// Điểm số đạt được (null nếu chưa chấm).
    /// </summary>
    public decimal? Score { get; set; }

    /// <summary>
    /// Lời nhận xét của người chấm.
    /// </summary>
    public string? Feedback { get; set; }

    /// <summary>
    /// ID người thực hiện chấm bài (có thể là Instructor hoặc Admin).
    /// </summary>
    public int? GradedById { get; set; }

    /// <summary>
    /// Họ tên người đã chấm điểm.
    /// </summary>
    public string? GradedByName { get; set; }

    /// <summary>
    /// Thời điểm hoàn tất việc chấm điểm (UTC).
    /// </summary>
    public DateTime? GradedAt { get; set; }

    /// <summary>
    /// Thời điểm học viên nộp bài (UTC).
    /// </summary>
    public DateTime SubmittedAt { get; set; }

    /// <summary>
    /// Thời điểm cập nhật trạng thái gần nhất.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    // ====================================================================================================
    // [LOGIC NGHIỆP VỤ TỰ ĐỘNG TÍNH TOÁN]:
    // - IsPassed: Tự động suy luận trạng thái Đạt/Không đạt dựa trên quy chế đào tạo (Điểm chuẩn >= 80).
    // - GradeTier: Phân hạng chất lượng giọng nói phục vụ khen thưởng hoặc phân loại học tập.
    // ====================================================================================================

    /// <summary>
    /// Thuộc tính dẫn xuất xác định bài nộp có đạt chuẩn đầu ra hay không.
    /// Trả về null nếu bài nộp chưa có điểm (Score == null).
    /// Trả về true nếu Score >= 80 điểm; ngược lại trả về false.
    /// </summary>
    public bool? IsPassed => Score.HasValue ? Score.Value >= 80 : null;

    /// <summary>
    /// Thuộc tính dẫn xuất trả về danh hiệu xếp loại học tập dựa trên điểm số.
    /// </summary>
    public string? GradeTier => Score.HasValue ? GetGradeTier(Score.Value) : null;

    /// <summary>
    /// Hàm tiện ích phân loại học lực theo các thang điểm chuẩn của trung tâm đào tạo MC:
    /// - Từ 95 đến 100 điểm: "Xuất sắc"
    /// - Từ 80 đến cận 95: "Giỏi" (Chuẩn đạt để tốt nghiệp hoặc mở khóa bài tiếp theo)
    /// - Từ 50 đến cận 80: "Cần cải thiện"
    /// - Từ 30 đến cận 50: "Trung bình"
    /// - Dưới 30 điểm: "Yếu"
    /// </summary>
    /// <param name="score">Điểm số thực tế từ 0 đến 100.</param>
    /// <returns>Chuỗi xếp loại tiếng Việt.</returns>
    public static string GetGradeTier(decimal score)
    {
        // [NHÁNH 1]: Kiểm tra mức điểm Xuất sắc (95 - 100)
        // Dành cho học viên có ngữ điệu hoàn hảo, chuẩn phong thái MC chuyên nghiệp.
        if (score >= 95) return "Xuất sắc";

        // [NHÁNH 2]: Kiểm tra mức điểm Giỏi (80 - cận 95)
        // Đạt chuẩn điểm qua môn (Passing score threshold) của hệ thống đào tạo.
        if (score >= 80) return "Giỏi";

        // [NHÁNH 3]: Kiểm tra mức điểm Cần cải thiện (50 - cận 80)
        // Học viên đã có cố gắng nhưng còn vấp, phát âm chưa chuẩn hoặc ngắt nhịp sai.
        if (score >= 50) return "Cần cải thiện";

        // [NHÁNH 4]: Kiểm tra mức điểm Trung bình (30 - cận 50)
        // Thiếu tự tin, giọng đọc đều đều hoặc sai nhiều từ khóa quan trọng.
        if (score >= 30) return "Trung bình";

        // [NHÁNH 5]: Trường hợp còn lại (dưới 30 điểm)
        // Chưa đạt yêu cầu tối thiểu, cần luyện tập lại nhiều lần từ cấp độ Beginner.
        return "Yếu";
    }
}
