// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: DTO (Data Transfer Object) trong kiến trúc phân tầng (Clean Architecture).
// - Nằm trong module: Features/Learning/DTOs.
// - Vai trò: Định dạng dữ liệu trao đổi liên quan đến Chứng chỉ hoàn thành khóa học (Certificate)
//   giữa Backend, Web Client và các hệ thống tra cứu chứng chỉ công khai (Public Verification Portal).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Trưng bày chứng chỉ khóa học của học viên sau khi hoàn thành 100% bài học và đạt điểm Speaking/Quiz.
// - Cung cấp cơ chế xác minh tính xác thực của chứng chỉ thông qua CertificateCode duy nhất (chống làm giả).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Database: Bảng Certificates, Enrollments, Users, Courses.
// - Service: CertificateService (IssueCertificateAsync, GetCertificateByIdAsync, VerifyCertificateAsync).
// - Controller: CertificatesController (api/certificates/...).
// - Client/External: Học viên xem/tải chứng chỉ cá nhân; Nhà tuyển dụng/bên thứ ba nhập mã xác thực công khai.
// ====================================================================================================

using System;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO chứa đầy đủ thông tin chi tiết của một Chứng chỉ hoàn thành khóa học để hiển thị trên giao diện hoặc in ấn/PDF.
/// </summary>
public class CertificateDto
{
    /// <summary>
    /// Mã định danh số của chứng chỉ trong hệ thống (Primary Key).
    /// </summary>
    public int CertificateId { get; set; }

    /// <summary>
    /// Khóa ngoại liên kết tới lượt ghi danh (Enrollment) tương ứng đã hoàn thành 100%.
    /// </summary>
    public int EnrollmentId { get; set; }

    /// <summary>
    /// ID tài khoản học viên sở hữu chứng chỉ.
    /// </summary>
    public int LearnerId { get; set; }

    /// <summary>
    /// Họ và tên học viên nhận chứng chỉ (lấy từ bảng Users/Learner).
    /// </summary>
    public string LearnerName { get; set; } = string.Empty;

    /// <summary>
    /// ID của khóa học được cấp chứng chỉ.
    /// </summary>
    public int CourseId { get; set; }

    /// <summary>
    /// Tên đầy đủ của khóa học.
    /// </summary>
    public string CourseTitle { get; set; } = string.Empty;

    /// <summary>
    /// Họ và tên của Giảng viên phụ trách khóa học (người ký chứng chỉ).
    /// </summary>
    public string InstructorName { get; set; } = string.Empty;

    /// <summary>
    /// Mã tra cứu chứng chỉ độc nhất vô nhị (Unique Code dạng UUID/GUID hoặc chuỗi ký tự quy chuẩn)
    /// phục vụ xác thực tính minh bạch của chứng chỉ.
    /// </summary>
    public string CertificateCode { get; set; } = string.Empty;

    /// <summary>
    /// Thời điểm chứng chỉ được cấp phát chính thức (UTC).
    /// </summary>
    public DateTime IssuedAt { get; set; }

    /// <summary>
    /// Tỷ lệ hoàn thành khóa học tại thời điểm cấp (thường là 100.00%).
    /// </summary>
    public decimal CompletionPercentage { get; set; }

    /// <summary>
    /// Xếp loại học lực tổng thể (ví dụ: "Xuất sắc", "Giỏi", "Đạt") dựa trên điểm số trung bình hoặc bài đánh giá cuối kỳ.
    /// </summary>
    public string? Grade { get; set; }

    /// <summary>
    /// Trạng thái hiệu lực của chứng chỉ ("ACTIVE" - Còn hiệu lực, "REVOKED" - Bị thu hồi).
    /// </summary>
    public string Status { get; set; } = "ACTIVE";

    /// <summary>
    /// Đường dẫn trực tiếp tới file ảnh/PDF chứng chỉ điện tử được lưu trữ trên Cloudinary/Storage.
    /// </summary>
    public string? CertificateUrl { get; set; }
}

/// <summary>
/// DTO phục vụ nghiệp vụ Tra cứu & Xác minh tính xác thực của chứng chỉ (Public Certificate Verification).
/// Không để lộ các thông tin bảo mật nhạy cảm (User ID, Enrollment ID).
/// </summary>
public class CertificateVerificationDto
{
    /// <summary>
    /// Mã chứng chỉ cần tra cứu.
    /// </summary>
    public string CertificateCode { get; set; } = string.Empty;

    /// <summary>
    /// Họ tên học viên được cấp.
    /// </summary>
    public string LearnerName { get; set; } = string.Empty;

    /// <summary>
    /// Tên khóa học đã hoàn thành.
    /// </summary>
    public string CourseTitle { get; set; } = string.Empty;

    /// <summary>
    /// Ngày cấp chứng chỉ.
    /// </summary>
    public DateTime IssuedAt { get; set; }

    /// <summary>
    /// Cờ xác nhận chứng chỉ có hợp lệ và còn hiệu lực hay không.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Trạng thái chứng chỉ hiện tại ("ACTIVE", "REVOKED", "NOT_FOUND").
    /// </summary>
    public string Status { get; set; } = "ACTIVE";
}
