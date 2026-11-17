// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Service Implementation (Business Logic Layer - Certificate Domain).
// - Nằm trong module: Features/Learning/Services.
// - Triển khai từ: ICertificateService.
// - Vai trò: Quản lý quy trình kiểm định điều kiện tốt nghiệp, cấp phát chứng chỉ số và xác minh chứng chỉ.
//   Áp dụng Repository Pattern thông qua IGenericRepository và Unit of Work để đảm bảo tính toàn vẹn giao dịch (ACID).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Đảm bảo tính khắt khe của chứng chỉ đào tạo MC:
//   1. Kiểm tra học viên có quyền truy cập khóa học hợp lệ (CanAccessCourseAsync).
//   2. Kiểm tra tỷ lệ hoàn thành bài học đạt chuẩn 100% (tất cả các bài học Active đều phải có IsCompleted = true).
//   3. Kiểm tra điều kiện phụ (Gatekeeper _access.CheckCertificateAsync): Phải hoàn thành toàn bộ Quiz và bài tập nói tốt nghiệp.
//   4. Tính bất biến và chống trùng lặp (Idempotency): Nếu học viên đã được cấp chứng chỉ cho khóa học này,
//      hệ thống trả về chứng chỉ cũ thay vì tạo thêm bản ghi mới trong CSDL.
//   5. Thu hồi quyền khóa học được tặng (Course Gift Grants Revocation) khi học viên hoàn thành khóa học chính.
//   6. Cung cấp cổng xác minh công khai (Public Verification Portal) chống làm giả bằng CertificateCode độc nhất vô nhị.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controllers: CertificatesController, LearningController (tự động cấp khi hoàn thành 100% tiến độ).
// - Repositories: IGenericRepository<Certificate>, <Enrollment>, <Lesson>, <LessonProgress>, <User>.
// - Dịch vụ phối hợp: ICourseLearningAccessService, ICourseGiftAccessService, ILearningAccessService, IUnitOfWork.
// ====================================================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Services;

/// <summary>
/// Lớp triển khai dịch vụ quản lý Chứng chỉ hoàn thành khóa học.
/// </summary>
public class CertificateService : ICertificateService
{
    private readonly IGenericRepository<Certificate> _certificateRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<LessonProgress> _progressRepository;
    private readonly IGenericRepository<User> _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICourseGiftAccessService _courseGiftAccess;
    private readonly ICourseLearningAccessService _courseAccess;
    private readonly ILearningAccessService _access;

    /// <summary>
    /// Khởi tạo CertificateService với các phụ thuộc cần thiết được tiêm từ DI Container.
    /// </summary>
    public CertificateService(
        IGenericRepository<Certificate> certificateRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<LessonProgress> progressRepository,
        IGenericRepository<User> userRepository,
        IUnitOfWork unitOfWork,
        ICourseGiftAccessService courseGiftAccess,
        ICourseLearningAccessService courseAccess,
        ILearningAccessService access)
    {
        _certificateRepository = certificateRepository;
        _enrollmentRepository = enrollmentRepository;
        _lessonRepository = lessonRepository;
        _progressRepository = progressRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _courseGiftAccess = courseGiftAccess;
        _courseAccess = courseAccess;
        _access = access;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy toàn bộ danh sách chứng chỉ đang có hiệu lực (ACTIVE) của học viên hiện tại.
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Tìm tất cả chứng chỉ theo LearnerId và Status == 'ACTIVE'.
    ///   - Bước 2: Gom danh sách EnrollmentId duy nhất và nạp đầy đủ thông tin Khóa học và Học viên.
    ///   - Bước 3: Ghép thông tin Enrollment vào từng Certificate qua Dictionary O(1).
    ///   - Bước 4: Sắp xếp theo ngày cấp (IssuedAt) mới nhất và ánh xạ sang CertificateDto.
    /// [Tại sao phải kiểm tra Status == "ACTIVE"]:
    /// - Nghiệp vụ thu hồi chứng chỉ: Nếu chứng chỉ bị Admin thu hồi vì phát hiện gian lận ("REVOKED"), học viên sẽ không thấy hiển thị trong danh mục chứng chỉ hợp lệ nữa.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <returns>Danh sách CertificateDto của học viên.</returns>
    public async Task<List<CertificateDto>> GetMyCertificatesAsync(int learnerId)
    {
        // [BƯỚC 1]: Truy vấn danh sách chứng chỉ của học viên với điều kiện Status == "ACTIVE"
        var certs = await _certificateRepository.FindAsync(
            c => c.Enrollment.LearnerId == learnerId && c.Status == "ACTIVE",
            c => c.Enrollment);

        // [BƯỚC 2]: Tải các quan hệ phụ thuộc cấp 2 (Navigation Properties) để phục vụ Mapping DTO
        var certList = certs.ToList();
        var enrollmentIds = certList.Select(c => c.EnrollmentId).Distinct().ToList();
        var enrollments = await _enrollmentRepository.FindAsync(
            e => enrollmentIds.Contains(e.EnrollmentId),
            e => e.Course,
            e => e.Learner);

        // [BƯỚC 3]: Tối ưu hóa việc ghép dữ liệu bằng Dictionary O(1) Lookup
        // [TẠI SAO DÙNG ToDictionary]:
        //   - Thay vì lặp 2 vòng for O(M * N), chuyển danh sách enrollments thành Dictionary giúp việc
        //     tìm kiếm Enrollment theo EnrollmentId đạt độ phức tạp thuật toán O(1), tối ưu CPU khi có nhiều chứng chỉ.
        var enrollmentDict = enrollments.ToDictionary(e => e.EnrollmentId);

        foreach (var cert in certList)
        {
            if (enrollmentDict.TryGetValue(cert.EnrollmentId, out var enr))
            {
                cert.Enrollment = enr;
            }
        }

        // [BƯỚC 4]: Sắp xếp chứng chỉ mới nhận nhất lên đầu và trả về danh sách DTO
        return certList
            .OrderByDescending(c => c.IssuedAt)
            .Select(MapToDto)
            .ToList();
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy thông tin chứng chỉ của một học viên trong một khóa học cụ thể.
    /// - End-to-End Flow: Tìm chứng chỉ theo cặp (LearnerId, CourseId, Status = 'ACTIVE') -> Nếu null trả về null -> Nạp quan hệ Course và Learner -> Map sang DTO.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>CertificateDto nếu có, ngược lại null.</returns>
    public async Task<CertificateDto?> GetCertificateByCourseAsync(int learnerId, int courseId)
    {
        // [BƯỚC 1]: Truy vấn chứng chỉ theo tổ hợp 3 điều kiện: LearnerId, CourseId, Status ACTIVE
        var certs = await _certificateRepository.FindAsync(
            c => c.Enrollment.LearnerId == learnerId &&
                 c.Enrollment.CourseId == courseId &&
                 c.Status == "ACTIVE",
            c => c.Enrollment);

        var cert = certs.FirstOrDefault();
        
        // [BƯỚC 1.1]: Rẽ nhánh kiểm tra sự tồn tại của chứng chỉ
        // - Điều kiện: `cert == null` (Học viên chưa hoàn thành khóa học hoặc chưa được cấp chứng chỉ).
        // - Xử lý: Trả về null ngay lập tức để Controller phản hồi HTTP 404 hoặc thông báo chưa có chứng chỉ.
        if (cert == null) return null;

        // [BƯỚC 2]: Nạp bổ sung thông tin Khóa học và Học viên để hiển thị tên trên phôi chứng chỉ
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.EnrollmentId == cert.EnrollmentId,
            e => e.Course,
            e => e.Learner);

        cert.Enrollment = enrollments.FirstOrDefault() ?? cert.Enrollment;

        // [BƯỚC 3]: Ánh xạ và trả về DTO
        return MapToDto(cert);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy chi tiết chứng chỉ theo ID kèm theo kiểm tra phân quyền bảo mật (Data Isolation & Access Control).
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Tìm Certificate theo certificateId -> Nếu không thấy trả về null.
    ///   - Bước 2: Nạp quan hệ Enrollment, Course, Learner.
    ///   - Bước 3: Phân quyền truy cập (Nếu truyền currentUserId): Kiểm tra xem người dùng có phải là Chủ sở hữu (LearnerId), hoặc Giảng viên dạy khóa học (InstructorId), hoặc Quản trị viên (Admin) hay không. Nếu không thỏa mãn -> Từ chối truy cập (trả về null).
    ///   - Bước 4: Trả về CertificateDto.
    /// </summary>
    /// <param name="certificateId">ID chứng chỉ.</param>
    /// <param name="currentUserId">ID người dùng đang đăng nhập gửi yêu cầu (tùy chọn).</param>
    /// <returns>CertificateDto nếu hợp lệ và có quyền; ngược lại trả về null.</returns>
    public async Task<CertificateDto?> GetCertificateByIdAsync(int certificateId, int? currentUserId = null)
    {
        // [BƯỚC 1]: Tìm chứng chỉ theo Khóa chính CertificateId
        var certs = await _certificateRepository.FindAsync(
            c => c.CertificateId == certificateId,
            c => c.Enrollment);

        var certificate = certs.FirstOrDefault();
        // Rẽ nhánh: Nếu không tìm thấy chứng chỉ trong CSDL -> Trả về null
        if (certificate == null) return null;

        // [BƯỚC 2]: Nạp thông tin Khóa học và Giảng viên
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.EnrollmentId == certificate.EnrollmentId,
            e => e.Course,
            e => e.Learner);

        certificate.Enrollment = enrollments.FirstOrDefault() ?? certificate.Enrollment;

        // [BƯỚC 3]: BẢO MẬT & PHÂN QUYỀN TRUY CẬP (ACCESS CONTROL CHECK)
        // - Điều kiện: `currentUserId.HasValue && certificate.Enrollment?.LearnerId != currentUserId.Value`
        //   (Người gửi request KHÔNG PHẢI là học viên sở hữu chứng chỉ này).
        if (currentUserId.HasValue && certificate.Enrollment?.LearnerId != currentUserId.Value)
        {
            // [BƯỚC 3.1]: Kiểm tra người xem có phải là Giảng viên của khóa học này không
            // - Điều kiện: `certificate.Enrollment?.Course?.InstructorId != currentUserId.Value`
            //   (Cũng không phải là Giảng viên phụ trách khóa học).
            if (certificate.Enrollment?.Course?.InstructorId != currentUserId.Value)
            {
                // [BƯỚC 3.2]: Kiểm tra người xem có vai trò Quản trị viên (Admin) hay không
                var users = await _userRepository.FindAsync(u => u.UserId == currentUserId.Value, u => u.Role);
                var user = users.FirstOrDefault();
                
                // Rẽ nhánh: Nếu vai trò không phải "Admin" -> Chặn hoàn toàn truy cập!
                // Trả về null để bảo mật thông tin, ngăn chặn tấn công duyệt ID chứng chỉ bừa bãi (BOLA / IDOR).
                if (user?.Role?.RoleName != "Admin")
                {
                    return null;
                }
            }
        }

        // [BƯỚC 4]: Người dùng hợp lệ (Chính chủ, Giảng viên hoặc Admin) -> Trả về DTO
        return MapToDto(certificate);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Kiểm tra điều kiện tốt nghiệp và cấp phát chứng chỉ mới cho học viên.
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Kiểm tra quyền truy cập khóa học qua _courseAccess.CanAccessCourseAsync.
    ///   - Bước 2: Kiểm tra bản ghi ghi danh (Enrollment) của học viên.
    ///   - Bước 3: Đảm bảo tính Idempotent: Nếu đã có chứng chỉ thì trả về chứng chỉ cũ ngay.
    ///   - Bước 4: Tính toán tỷ lệ hoàn thành bài học (phải đủ 100% các bài Active).
    ///   - Bước 5: Kiểm tra điều kiện tiên quyết (Gatekeeper _access.CheckCertificateAsync) về Quiz và Speaking.
    ///   - Bước 6: Sinh mã chứng chỉ duy nhất dạng CERT-YYYY-XXXXXX.
    ///   - Bước 7: Tạo Certificate trong CSDL, thu hồi quyền tặng khóa học học thử, lưu Db và trả về DTO.
    /// </summary>
    /// <param name="learnerId">ID học viên.</param>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>CertificateDto vừa được cấp hoặc đã tồn tại.</returns>
    public async Task<CertificateDto?> IssueCertificateAsync(int learnerId, int courseId)
    {
        // ====================================================================================================
        // [BƯỚC 1]: KIỂM TRA QUYỀN TRUY CẬP KHÓA HỌC HIỆN TẠI
        // ====================================================================================================
        // - Điều kiện: `!await _courseAccess.CanAccessCourseAsync(courseId, learnerId, isAdmin: false)`.
        // - Trường hợp ĐÚNG (TRUE): Khóa học đã hết hạn truy cập, bị khóa hoặc học viên chưa mua.
        //     + Ném `InvalidOperationException("Learner does not currently have access to this course.")`.
        //     + Dừng thực thi ngay lập tức, không thay đổi CSDL.
        // - Trường hợp SAI (FALSE): Học viên có quyền hợp lệ, tiếp tục bước 2.
        if (!await _courseAccess.CanAccessCourseAsync(courseId, learnerId, isAdmin: false))
            throw new InvalidOperationException("Learner does not currently have access to this course.");

        // [BƯỚC 2]: Kiểm tra sự tồn tại của bản ghi Ghi danh (Enrollment)
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId && e.CourseId == courseId,
            e => e.Course,
            e => e.Learner);

        var enrollment = enrollments.FirstOrDefault();

        // Rẽ nhánh: Nếu học viên chưa từng ghi danh vào khóa học này -> Ném ArgumentException
        if (enrollment == null)
        {
            throw new ArgumentException("Learner is not enrolled in this course.");
        }

        // ====================================================================================================
        // [BƯỚC 3]: NGUYÊN TẮC BẤT BIẾN / CHỐNG TRÙNG LẶP (IDEMPOTENCY CHECK)
        // ====================================================================================================
        // - Tìm xem trong bảng Certificates đã có chứng chỉ nào gắn với EnrollmentId này chưa.
        var existingCerts = await _certificateRepository.FindAsync(
            c => c.EnrollmentId == enrollment.EnrollmentId);

        var existingCert = existingCerts.FirstOrDefault();

        // Rẽ nhánh: Nếu đã từng được cấp chứng chỉ trước đó
        // - Trường hợp ĐÚNG (`existingCert != null`):
        //     + Gán lại thông tin Enrollment và RETURN ngay chứng chỉ đã có.
        //     + Ý NGHĨA NGHIỆP VỤ: Đảm bảo tính Idempotent: 1 học viên hoàn thành 1 khóa học thì dù có bấm nút
        //       "Nhận chứng chỉ" 10 lần thì hệ thống vẫn chỉ phát hành duy nhất 1 chứng chỉ, không tạo rác CSDL.
        if (existingCert != null)
        {
            existingCert.Enrollment = enrollment;
            return MapToDto(existingCert);
        }

        // ====================================================================================================
        // [BƯỚC 4]: XÁC MINH TỶ LỆ HOÀN THÀNH KHÓA HỌC (COMPLETION RATE VERIFICATION)
        // ====================================================================================================
        // 4.1: Đếm tổng số bài học đang có trạng thái ACTIVE trong khóa học
        var totalLessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == courseId && l.Status == Core.Enums.LessonStatus.ACTIVE);
        var totalLessons = totalLessonsList.Count();

        // 4.2: Đếm số lượng bài học mà học viên đã hoàn thành thực sự (IsCompleted == true hoặc Status == COMPLETED)
        var completedLessonsList = await _progressRepository.FindAsync(
            lp => lp.EnrollmentId == enrollment.EnrollmentId &&
                 (lp.IsCompleted || lp.Status == Core.Enums.LessonProgressStatus.COMPLETED));
        var completedLessons = completedLessonsList.Count();

        // 4.3: Tính tỷ lệ phần trăm hoàn thành, làm tròn 2 chữ số thập phân
        decimal completionPercentage = totalLessons > 0
            ? Math.Round((decimal)completedLessons / totalLessons * 100, 2)
            : 0m;

        // [BƯỚC 4.4]: Rẽ nhánh kiểm tra điều kiện hoàn thành 100%
        // - Điều kiện: `totalLessons > 0 && completedLessons < totalLessons && enrollment.CompletionPercentage < 100.00m`.
        // - Trường hợp ĐÚNG (TRUE):
        //     + Học viên chưa học xong toàn bộ các bài học trong khóa học.
        //     + Ném ra `InvalidOperationException($"Cannot issue certificate. Course completion is only {completionPercentage}%.")`.
        //     + Dừng quy trình cấp chứng chỉ, bảo vệ uy tín của hệ thống giáo dục.
        // - Trường hợp SAI (FALSE): Đã hoàn thành 100% nội dung bài giảng, đi tiếp xuống [BƯỚC 5].
        if (totalLessons > 0 && completedLessons < totalLessons && enrollment.CompletionPercentage < 100.00m)
        {
            throw new InvalidOperationException($"Cannot issue certificate. Course completion is only {completionPercentage}%.");
        }

        // ====================================================================================================
        // [BƯỚC 5]: KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT BỔ SUNG (GATEKEEPER POLICY CHECK)
        // ====================================================================================================
        // Gọi _access.CheckCertificateAsync để kiểm tra toàn bộ Quiz bắt buộc và Bài thi Speaking cuối khóa
        var access = await _access.CheckCertificateAsync(learnerId, courseId);
        
        // Rẽ nhánh: Nếu người gác cổng báo chưa đạt điều kiện (ví dụ chưa đạt 80 điểm Speaking Final)
        // - Ném InvalidOperationException kèm lý do chi tiết (access.Reason) để người dùng biết cần hoàn thành bài nào.
        if (!access.Allowed) throw new InvalidOperationException(access.Reason ?? "Course requirements are incomplete.");

        // ====================================================================================================
        // [BƯỚC 6]: SINH MÃ CHỨNG CHỈ DUY NHẤT & KHỞI TẠO THỰC THỂ
        // ====================================================================================================
        string code = GenerateUniqueCertificateCode();

        var certificate = new Certificate
        {
            EnrollmentId = enrollment.EnrollmentId,
            CertificateCode = code,
            IssuedAt = DateTime.UtcNow,
            CompletionPercentage = 100.00m,
            Grade = "EXCELLENT",
            Status = "ACTIVE"
        };

        // ====================================================================================================
        // [BƯỚC 7]: LƯU CHỨNG CHỈ VÀ THU HỒI QUÀ TẶNG TRONG MỘT GIAO DỊCH DATABASE (TRANSACTION)
        // ====================================================================================================
        await _certificateRepository.AddAsync(certificate);
        
        // Thu hồi quyền truy cập của các khóa học tặng kèm (Gifts) khi khóa học chính đã hoàn tất
        await _courseGiftAccess.RevokeGiftGrantsForCompletedEnrollmentAsync(enrollment.EnrollmentId, DateTime.UtcNow);
        
        // Lưu toàn bộ thay đổi qua UnitOfWork (Commit Transaction)
        await _unitOfWork.SaveChangesAsync();

        certificate.Enrollment = enrollment;
        return MapToDto(certificate);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xác thực công khai tính hợp lệ của một chứng chỉ dựa vào mã code (Public Certificate Verification).
    /// - End-to-End Execution Flow:
    ///   - Bước 1: Chuẩn hóa mã code (Trim, ToUpperInvariant). Nếu rỗng -> Trả về null.
    ///   - Bước 2: Tìm chứng chỉ theo CertificateCode trong CSDL.
    ///   - Bước 3: Nếu không tìm thấy: Trả về DTO với IsValid = false và Status = 'NOT_FOUND'.
    ///   - Bước 4: Nếu tìm thấy: Nạp quan hệ Course và Learner, trả về DTO với IsValid = (Status == 'ACTIVE').
    /// </summary>
    /// <param name="code">Mã chứng chỉ nhập vào từ trang web tra cứu.</param>
    /// <returns>CertificateVerificationDto chứa thông tin xác thực.</returns>
    public async Task<CertificateVerificationDto?> VerifyCertificateAsync(string code)
    {
        // Rẽ nhánh: Nếu mã code truyền vào rỗng hoặc chỉ có khoảng trắng -> Trả về null
        if (string.IsNullOrWhiteSpace(code)) return null;

        var cleanCode = code.Trim().ToUpperInvariant();

        // [BƯỚC 1]: Tìm chứng chỉ theo mã CertificateCode
        var certs = await _certificateRepository.FindAsync(
            c => c.CertificateCode.ToUpper() == cleanCode,
            c => c.Enrollment);

        var cert = certs.FirstOrDefault();

        // [BƯỚC 2]: Rẽ nhánh xử lý khi KHÔNG TÌM THẤY CHỨNG CHỈ (cert == null)
        // - Trả về trạng thái "NOT_FOUND" và IsValid = false để giao diện hiển thị cảnh báo chứng chỉ giả mạo.
        if (cert == null)
        {
            return new CertificateVerificationDto
            {
                CertificateCode = cleanCode,
                LearnerName = "N/A",
                CourseTitle = "N/A",
                IssuedAt = DateTime.MinValue,
                IsValid = false,
                Status = "NOT_FOUND"
            };
        }

        // [BƯỚC 3]: Nạp thông tin chủ sở hữu và khóa học
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.EnrollmentId == cert.EnrollmentId,
            e => e.Course,
            e => e.Learner);

        cert.Enrollment = enrollments.FirstOrDefault() ?? cert.Enrollment;

        // [BƯỚC 4]: Trả về kết quả xác minh công khai
        // Chứng chỉ chỉ hợp lệ (IsValid = true) khi trạng thái Status chính xác là "ACTIVE"
        return new CertificateVerificationDto
        {
            CertificateCode = cert.CertificateCode,
            LearnerName = cert.Enrollment?.Learner?.FullName ?? "Learner",
            CourseTitle = cert.Enrollment?.Course?.Title ?? "Course",
            IssuedAt = cert.IssuedAt,
            IsValid = cert.Status == "ACTIVE",
            Status = cert.Status
        };
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm tiện ích sinh mã chứng chỉ độc nhất vô nhị (Unique Code Generator) theo định dạng chuẩn quốc tế:
    ///   `CERT-{Năm_Hiện_Tại}-{8_Ký_Tự_Hex_Ngẫu_Nhiên_Từ_GUID}` (ví dụ: CERT-2026-A1B2C3D4).
    /// </summary>
    /// <returns>Chuỗi mã chứng chỉ độc nhất.</returns>
    private string GenerateUniqueCertificateCode()
    {
        var year = DateTime.UtcNow.Year;
        var randomPart = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
        return $"CERT-{year}-{randomPart}";
    }

    /// <summary>
    /// [Dòng này làm gì]: Ánh xạ thực thể Certificate sang CertificateDto phục vụ Client.
    /// Sử dụng toán tử null-conditional (?.) và null-coalescing (??) để tránh NullReferenceException.
    /// </summary>
    /// <param name="c">Thực thể Certificate.</param>
    /// <returns>CertificateDto.</returns>
    private static CertificateDto MapToDto(Certificate c)
    {
        return new CertificateDto
        {
            CertificateId = c.CertificateId,
            EnrollmentId = c.EnrollmentId,
            LearnerId = c.Enrollment?.LearnerId ?? 0,
            LearnerName = c.Enrollment?.Learner?.FullName ?? "Learner",
            CourseId = c.Enrollment?.CourseId ?? 0,
            CourseTitle = c.Enrollment?.Course?.Title ?? "Course",
            InstructorName = c.Enrollment?.Course?.Instructor?.FullName ?? "Instructor",
            CertificateCode = c.CertificateCode,
            IssuedAt = c.IssuedAt,
            CompletionPercentage = c.CompletionPercentage,
            Grade = c.Grade,
            Status = c.Status,
            CertificateUrl = c.CertificateUrl
        };
    }
}
