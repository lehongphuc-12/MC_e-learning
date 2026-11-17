// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Interface (Business Logic Layer) trong kiến trúc phân tầng Clean Architecture.
// - Nằm trong module: Features/Learning/Services/Interfaces.
// - Vai trò: Định nghĩa hợp đồng nghiệp vụ cho việc Cấp phát (Issue), Truy xuất (Query) và Xác minh (Verify)
//   chứng chỉ hoàn thành khóa học (Certificate Management).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Đảm bảo tính toàn vẹn của điều kiện tốt nghiệp: Chỉ cấp chứng chỉ khi học viên hoàn thành 100% bài học,
//   vượt qua các bài kiểm tra trắc nghiệm (Quizzes) và bài tập nói tốt nghiệp (Speaking Final).
// - Đảm bảo mỗi học viên chỉ nhận 1 chứng chỉ duy nhất cho mỗi khóa học (Idempotent Issuance).
// - Cung cấp API xác thực công khai bằng CertificateCode cho các bên thứ ba (nhà tuyển dụng) tra cứu.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: CertificatesController, LearningController.
// - Triển khai: CertificateService.
// - Phụ thuộc: UnitOfWork, ILearningAccessService, CloudinaryService/EmailService (nếu gửi thông báo).
// ====================================================================================================

using MC_BE.Features.Learning.DTOs;

namespace MC_BE.Features.Learning.Services.Interfaces;

/// <summary>
/// [Định nghĩa Interface]: Giao diện dịch vụ nghiệp vụ quản lý Chứng chỉ hoàn thành khóa học.
/// [Giải phẫu cú pháp]:
/// - `public`: Công khai toàn hệ thống.
/// - `interface`: Khai báo giao diện hợp đồng.
/// - `ICertificateService`: Tên interface dịch vụ chứng chỉ.
/// </summary>
public interface ICertificateService
{
    /// <summary>
    /// [Dòng này làm gì]: Lấy danh sách toàn bộ chứng chỉ đã được cấp cho học viên hiện tại.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<List<CertificateDto>>`: Trả về danh sách chứng chỉ DTO của học viên.
    /// - `int learnerId`: ID của học viên đăng nhập.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách chứng chỉ sắp xếp theo ngày cấp mới nhất.</returns>
    Task<List<CertificateDto>> GetMyCertificatesAsync(int learnerId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy chứng chỉ của học viên trong một khóa học cụ thể.
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `Task<CertificateDto?>`: Nullable DTO, trả về null nếu học viên chưa hoàn thành khóa học hoặc chưa được cấp.
    /// - `int learnerId`: ID học viên.
    /// - `int courseId`: ID khóa học.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>CertificateDto nếu đã được cấp; ngược lại trả về null.</returns>
    Task<CertificateDto?> GetCertificateByCourseAsync(int learnerId, int courseId);

    /// <summary>
    /// [Dòng này làm gì]: Lấy chi tiết chứng chỉ theo ID, có kiểm tra quyền sở hữu (chỉ chính chủ học viên, giảng viên khóa học hoặc Admin mới được xem đầy đủ).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int certificateId`: Khóa chính CertificateId.
    /// - `int? currentUserId = null`: ID người dùng đang gửi request, có giá trị mặc định là null.
    /// </summary>
    /// <param name="certificateId">ID chứng chỉ.</param>
    /// <param name="currentUserId">ID người dùng đang đăng nhập gửi request (tùy chọn).</param>
    /// <returns>CertificateDto hoặc null nếu không tồn tại / không có quyền.</returns>
    Task<CertificateDto?> GetCertificateByIdAsync(int certificateId, int? currentUserId = null);

    /// <summary>
    /// [Dòng này làm gì]: Tiến hành kiểm tra điều kiện và cấp phát chứng chỉ mới cho học viên trong khóa học.
    /// Nếu đã cấp trước đó, trả về chứng chỉ hiện có (nguyên tắc Bất biến / Idempotent).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `int learnerId`: ID học viên.
    /// - `int courseId`: ID khóa học yêu cầu cấp chứng chỉ.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>CertificateDto mới được cấp hoặc đã tồn tại.</returns>
    Task<CertificateDto?> IssueCertificateAsync(int learnerId, int courseId);

    /// <summary>
    /// [Dòng này làm gì]: Xác thực công khai tính hợp lệ của chứng chỉ dựa vào mã chứng chỉ (CertificateCode).
    /// Cho phép truy cập không cần đăng nhập (Public Endpoint).
    /// [Giải phẫu cú pháp & kiểu dữ liệu]:
    /// - `string code`: Mã chứng chỉ độc nhất (ví dụ: "CERT-2026-ABCD1234").
    /// - `Task<CertificateVerificationDto?>`: DTO phản hồi chứa trạng thái IsValid và thông tin hiển thị.
    /// </summary>
    /// <param name="code">Mã chứng chỉ dạng chuỗi (ví dụ: "CERT-2026-ABCD1234").</param>
    /// <returns>Thông tin xác thực CertificateVerificationDto hoặc null nếu mã không hợp lệ.</returns>
    Task<CertificateVerificationDto?> VerifyCertificateAsync(string code);
}
