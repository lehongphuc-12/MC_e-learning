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
    // [Dòng này làm gì]: Lưu mã định danh số (Khóa chính) của chứng chỉ trong CSDL.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Cho phép truy cập từ mọi tầng và tuần tự hóa JSON.
    //   - `int`: Kiểu số nguyên 32-bit (System.Int32).
    //   - `CertificateId`: Tên định danh khóa chính.
    //   - `{ get; set; }`: Cặp accessor getter/setter.
    public int CertificateId { get; set; }

    // [Dòng này làm gì]: Lưu ID bản ghi ghi danh (Enrollment) tương ứng đã hoàn thành 100% để cấp chứng chỉ này.
    // [Giải phẫu từng từ khóa]:
    //   - `public int EnrollmentId { get; set; }`: Khóa ngoại số nguyên 32-bit liên kết bảng Enrollments.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Là căn cứ để kiểm tra tính Idempotent (chống cấp trùng): Mỗi EnrollmentId chỉ được phép sinh ra tối đa 1 chứng chỉ duy nhất.
    public int EnrollmentId { get; set; }

    // [Dòng này làm gì]: Lưu ID tài khoản của học viên sở hữu chứng chỉ.
    // [Giải phẫu từng từ khóa]:
    //   - `public int LearnerId { get; set; }`: Khóa ngoại số nguyên 32-bit liên kết bảng Users.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Phục vụ kiểm tra phân quyền (Data Isolation Check): Chỉ chính chủ `learnerId == currentUserId` hoặc Admin mới có quyền truy cập API chi tiết chứng chỉ này.
    public int LearnerId { get; set; }

    // [Dòng này làm gì]: Khai báo thuộc tính lưu trữ họ tên đầy đủ của học viên nhận chứng chỉ để hiển thị trên phôi chứng chỉ.
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Access modifier cho phép các tầng khác (Controller, Service, AutoMapper, JSON Serializer) truy cập được thuộc tính này từ bên ngoài class. Nếu để private, thư viện chuyển đổi JSON (System.Text.Json) sẽ không đọc/ghi được dữ liệu.
    //   - `string`: Kiểu dữ liệu chuỗi ký tự (reference type) lưu tên học viên.
    //   - `{ get; set; }`: Auto-implemented Property. `get` cho phép đọc giá trị ra (ví dụ khi serialize trả JSON về Frontend), `set` cho phép gán giá trị vào (ví dụ khi map dữ liệu từ Entity sang DTO). Nếu bỏ `set;`, biến này thành chỉ đọc (read-only) và không thể gán dữ liệu sau khi khởi tạo.
    //   - `= string.Empty;`: Gán giá trị khởi tạo mặc định là chuỗi rỗng ("") ngay khi tạo object.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Trong .NET 8/9 bật tính năng Nullable Reference Types (<Nullable>enable</Nullable>), kiểu string không cho phép null. Nếu không gán `= string.Empty;`, trình biên dịch sẽ báo cảnh báo CS8618 (Non-nullable property must contain a non-null value) và khi runtime nếu quên gán giá trị, biến mang giá trị null rất dễ gây lỗi NullReferenceException khi gọi `.Trim()`, `.ToUpper()` hoặc render ra UI.
    // [Cách viết thay thế & So sánh]: Có thể thay bằng `= "";` (tương đương nhưng string.Empty chuẩn convention C# và rõ nghĩa hơn, không tạo thêm literal), hoặc dùng `public required string LearnerName { get; set; }` (C# 11+ ép buộc nơi khởi tạo object phải truyền giá trị ngay lúc new), hoặc `public string? LearnerName { get; set; }` nếu nghiệp vụ cho phép tên bị null.
    public string LearnerName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu ID của khóa học được cấp chứng chỉ.
    // [Giải phẫu từng từ khóa]:
    //   - `public int CourseId { get; set; }`: Khóa ngoại số nguyên 32-bit liên kết bảng Courses.
    public int CourseId { get; set; }

    // [Dòng này làm gì]: Lưu tên đầy đủ của khóa học (ví dụ: "Nghệ thuật Dẫn chương trình & Làm chủ Sân khấu").
    // [Giải phẫu từng từ khóa]:
    //   - `public string CourseTitle { get; set; } = string.Empty;`: Chuỗi ký tự công khai, khởi tạo chuỗi rỗng an toàn null.
    public string CourseTitle { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu họ và tên của Giảng viên phụ trách khóa học (người ký chứng chỉ tốt nghiệp).
    // [Giải phẫu từng từ khóa]:
    //   - `public string InstructorName { get; set; } = string.Empty;`: Chuỗi ký tự lưu tên giảng viên, khởi tạo rỗng tránh null pointer.
    public string InstructorName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu mã định danh tra cứu duy nhất của chứng chỉ (ví dụ: "CERT-2026-A1B2C3D4").
    // [Giải phẫu từng từ khóa]:
    //   - `public string CertificateCode { get; set; } = string.Empty;`: Chuỗi ký tự mã chứng chỉ độc nhất vô nhị.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Đây là "chìa khóa công khai" dùng cho cổng xác thực trực tuyến. Mã này được sinh từ thuật toán ngẫu nhiên GUID kết hợp năm cấp để đảm bảo tính duy nhất tuyệt đối trên toàn hệ thống.
    public string CertificateCode { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu thời điểm chính xác chứng chỉ được phát hành theo giờ quốc tế UTC.
    // [Giải phẫu từng từ khóa]:
    //   - `public DateTime IssuedAt { get; set; }`: Cấu trúc DateTime lưu ngày giờ cấp chứng chỉ.
    public DateTime IssuedAt { get; set; }

    // [Dòng này làm gì]: Lưu tỷ lệ hoàn thành khóa học tại thời điểm cấp chứng chỉ (thường đạt 100.00%).
    // [Giải phẫu từng từ khóa]:
    //   - `public`: Công khai ra ngoài.
    //   - `decimal`: Kiểu số thực dấu phẩy tĩnh 128-bit độ chính xác cao trong .NET (System.Decimal), chuyên dùng cho tính toán tỷ lệ %, tài chính, điểm số để tránh sai số làm tròn của `float` hoặc `double`.
    //   - `CompletionPercentage`: Tên thuộc tính % hoàn thành.
    //   - `{ get; set; }`: Getter/Setter.
    // [Tại sao phải dùng & Rủi ro nếu thiếu]: Cần lưu chính xác 2 chữ số thập phân (ví dụ 100.00) để in lên chứng chỉ hoặc kiểm định điều kiện tốt nghiệp.
    public decimal CompletionPercentage { get; set; }

    // [Dòng này làm gì]: Lưu xếp loại học lực tốt nghiệp của học viên (ví dụ: "EXCELLENT", "GOOD", "Xuất sắc").
    // [Giải phẫu từng từ khóa]:
    //   - `public string? Grade { get; set; }`: Chuỗi ký tự cho phép null (`string?`), vì có thể có khóa học cấp chứng chỉ hoàn thành chung mà không phân hạng điểm số.
    public string? Grade { get; set; }

    // [Dòng này làm gì]: Lưu trạng thái hiệu lực hiện tại của chứng chỉ ("ACTIVE" - Còn hiệu lực, "REVOKED" - Bị thu hồi do gian lận).
    // [Giải phẫu từng từ khóa]:
    //   - `public string Status { get; set; } = "ACTIVE";`: Khởi tạo giá trị mặc định là "ACTIVE".
    public string Status { get; set; } = "ACTIVE";

    // [Dòng này làm gì]: Lưu đường dẫn tải file PDF/ảnh chứng chỉ điện tử chất lượng cao lưu trên Cloudinary/Storage.
    // [Giải phẫu từng từ khóa]:
    //   - `public string? CertificateUrl { get; set; }`: Chuỗi URL cho phép null (khi chứng chỉ mới cấp chưa kịp kết xuất file PDF).
    public string? CertificateUrl { get; set; }
}

/// <summary>
/// DTO phục vụ nghiệp vụ Tra cứu & Xác minh tính xác thực của chứng chỉ (Public Certificate Verification).
/// Không để lộ các thông tin bảo mật nhạy cảm (User ID, Enrollment ID).
/// </summary>
public class CertificateVerificationDto
{
    // [Dòng này làm gì]: Lưu mã chứng chỉ cần xác minh.
    // [Giải phẫu từng từ khóa]: `public string CertificateCode { get; set; } = string.Empty;`
    public string CertificateCode { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu tên học viên đã được cấp chứng chỉ để bên thứ 3 (nhà tuyển dụng) đối chiếu.
    // [Giải phẫu từng từ khóa]: `public string LearnerName { get; set; } = string.Empty;`
    public string LearnerName { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu tên khóa học hoàn thành.
    // [Giải phẫu từng từ khóa]: `public string CourseTitle { get; set; } = string.Empty;`
    public string CourseTitle { get; set; } = string.Empty;

    // [Dòng này làm gì]: Lưu ngày cấp chứng chỉ.
    // [Giải phẫu từng từ khóa]: `public DateTime IssuedAt { get; set; }`
    public DateTime IssuedAt { get; set; }

    // [Dòng này làm gì]: Cờ boolean xác nhận chứng chỉ có hợp lệ và đang hoạt động hay không.
    // [Giải phẫu từng từ khóa]:
    //   - `public bool IsValid { get; set; }`: Nhận giá trị `true` nếu tìm thấy chứng chỉ và `Status == "ACTIVE"`; ngược lại `false`.
    public bool IsValid { get; set; }

    // [Dòng này làm gì]: Chuỗi trạng thái chi tiết của chứng chỉ ("ACTIVE", "REVOKED", "NOT_FOUND").
    // [Giải phẫu từng từ khóa]: `public string Status { get; set; } = "ACTIVE";`
    public string Status { get; set; } = "ACTIVE";
}
