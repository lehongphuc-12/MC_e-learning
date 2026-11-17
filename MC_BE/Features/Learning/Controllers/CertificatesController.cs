// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Learning/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API.
// - Định tuyến: [Route("api/[controller]")] tương ứng URL /api/certificates.
// - Vai trò: Tiếp nhận các yêu cầu tra cứu, cấp phát và xác thực chứng chỉ hoàn thành khóa học (Certificate).
//   Cung cấp cả Endpoint bảo mật (yêu cầu JWT Token [Authorize]) cho học viên và Endpoint mở [AllowAnonymous]
//   cho công chúng tra cứu mã chứng chỉ.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cho phép học viên xem danh sách các chứng chỉ đã đạt được của bản thân.
// - Cho phép học viên yêu cầu cấp chứng chỉ (Issue Certificate) khi hoàn thành 100% khóa học.
// - Cho phép nhà tuyển dụng, đối tác và công chúng tra cứu tính xác thực của chứng chỉ thông qua mã code độc nhất.
// - Đảm bảo an toàn thông tin: Ngăn chặn học viên xem trộm chứng chỉ của người khác (BOLA / IDOR Defense).
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client -> Gửi Request tới CertificatesController.
// - Controller -> Giải mã JWT Claims lấy LearnerId -> Điều hướng tới ICertificateService.
// - ICertificateService -> Thực thi logic nghiệp vụ, truy vấn CSDL và trả về DTO.
// - Controller bọc kết quả vào ApiResponse<T> -> Trả về Client.
// ====================================================================================================

using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Learning.Controllers;

/// <summary>
/// API Controller quản lý cấp phát, tra cứu và xác minh Chứng chỉ hoàn thành khóa học.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateService _certificateService;

    /// <summary>
    /// Khởi tạo Controller với CertificateService được inject qua DI Container.
    /// </summary>
    public CertificatesController(ICertificateService certificateService)
    {
        _certificateService = certificateService;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm tiện ích (Private Helper) lấy ID người dùng từ Claims trong JWT Token đã giải mã.
    /// - Đọc Claim `ClaimTypes.NameIdentifier` từ `HttpContext.User`.
    /// - Gọi `int.TryParse(claim, out var id)` chuyển chuỗi sang số nguyên; nếu thất bại hoặc null thì trả về null.
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu không tìm thấy claim NameIdentifier.</returns>
    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/certificates/my-certificates
    /// Lấy danh sách toàn bộ các chứng chỉ mà học viên hiện tại đã đạt được.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất learnerId từ JWT Token. Nếu null -> Trả về HTTP 401 Unauthorized.</para>
    /// <para>Bước 2: Gọi _certificateService.GetMyCertificatesAsync(learnerId).</para>
    /// <para>Bước 3: Trả về HTTP 200 OK kèm danh sách CertificateDto.</para>
    /// </summary>
    /// <returns>ApiResponse chứa danh sách chứng chỉ.</returns>
    [HttpGet("my-certificates")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<List<CertificateDto>>>> GetMyCertificates()
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<List<CertificateDto>>.FailureResponse("Unauthorized."));
        }

        var certificates = await _certificateService.GetMyCertificatesAsync(learnerId.Value);
        return Ok(ApiResponse<List<CertificateDto>>.SuccessResponse(certificates, "Certificates retrieved successfully."));
    }

    /// <summary>
    /// GET /api/certificates/course/{courseId}
    /// Lấy chứng chỉ của học viên hiện tại trong một khóa học cụ thể.
    /// <para>End-to-End Flow: Kiểm tra Token -> Gọi Service GetCertificateByCourseAsync -> Nếu null trả về 404 Not Found -> Nếu có trả về 200 OK.</para>
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>ApiResponse chứa CertificateDto.</returns>
    [HttpGet("course/{courseId:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CertificateDto>>> GetCertificateByCourse(int courseId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CertificateDto>.FailureResponse("Unauthorized."));
        }

        var cert = await _certificateService.GetCertificateByCourseAsync(learnerId.Value, courseId);
        if (cert == null)
        {
            return NotFound(ApiResponse<CertificateDto>.FailureResponse("Certificate not found for this course."));
        }

        return Ok(ApiResponse<CertificateDto>.SuccessResponse(cert, "Certificate retrieved successfully."));
    }

    /// <summary>
    /// GET /api/certificates/{certificateId}
    /// Lấy chi tiết thông tin một chứng chỉ theo CertificateId có kiểm tra phân quyền sở hữu (BOLA/IDOR Defense).
    /// <para>End-to-End Flow: Lấy learnerId từ Token -> Gọi Service GetCertificateByIdAsync(certificateId, learnerId) -> Nếu null (không có hoặc không có quyền) trả về 404 Not Found -> Trả về 200 OK.</para>
    /// </summary>
    /// <param name="certificateId">ID chứng chỉ.</param>
    /// <returns>ApiResponse chứa thông tin chi tiết chứng chỉ.</returns>
    [HttpGet("{certificateId:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CertificateDto>>> GetCertificateById(int certificateId)
    {
        var learnerId = GetCurrentUserId();
        var cert = await _certificateService.GetCertificateByIdAsync(certificateId, learnerId);
        if (cert == null)
        {
            return NotFound(ApiResponse<CertificateDto>.FailureResponse("Certificate not found or access denied."));
        }

        return Ok(ApiResponse<CertificateDto>.SuccessResponse(cert, "Certificate details retrieved successfully."));
    }

    /// <summary>
    /// POST /api/certificates/issue/{courseId}
    /// Yêu cầu cấp phát chứng chỉ số cho học viên khi hoàn thành 100% khóa học.
    /// Phương thức có tính Bất biến / Chống trùng lặp (Idempotent).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Xác thực danh tính học viên từ Token.</para>
    /// <para>Bước 2: Gọi _certificateService.IssueCertificateAsync(learnerId, courseId).</para>
    /// <para>Bước 3: Nếu thành công -> Trả về HTTP 200 OK kèm CertificateDto mới hoặc đã có.</para>
    /// <para>Bước 4: Bắt ArgumentException (chưa ghi danh) -> Trả về HTTP 400 Bad Request.</para>
    /// <para>Bước 5: Bắt InvalidOperationException (chưa đủ 100% tiến độ, chưa đỗ bài thi) -> Trả về HTTP 400.</para>
    /// <para>Bước 6: Bắt Exception ngoài ý muốn -> Trả về HTTP 500.</para>
    /// </summary>
    /// <param name="courseId">ID khóa học yêu cầu cấp chứng chỉ.</param>
    /// <returns>ApiResponse chứa CertificateDto.</returns>
    [HttpPost("issue/{courseId:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CertificateDto>>> IssueCertificate(int courseId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CertificateDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            var cert = await _certificateService.IssueCertificateAsync(learnerId.Value, courseId);
            if (cert == null)
            {
                return BadRequest(ApiResponse<CertificateDto>.FailureResponse("Unable to issue certificate."));
            }

            return Ok(ApiResponse<CertificateDto>.SuccessResponse(cert, "Certificate issued successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<CertificateDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CertificateDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<CertificateDto>.FailureResponse("An error occurred while issuing certificate: " + ex.Message));
        }
    }

    /// <summary>
    /// GET /api/certificates/verify/{code}
    /// Cổng tra cứu và xác minh tính xác thực của chứng chỉ công khai (Public Verification Portal).
    /// Cho phép truy cập nặc danh không cần Token ([AllowAnonymous]).
    /// <para>End-to-End Flow: Nhận code từ URL -> Gọi Service VerifyCertificateAsync -> Nếu null hoặc !IsValid trả về 404 Not Found -> Nếu hợp lệ trả về 200 OK.</para>
    /// </summary>
    /// <param name="code">Mã chứng chỉ duy nhất dạng chuỗi (ví dụ: CERT-2026-ABCD1234).</param>
    /// <returns>ApiResponse chứa thông tin xác minh CertificateVerificationDto.</returns>
    [HttpGet("verify/{code}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CertificateVerificationDto>>> VerifyCertificate(string code)
    {
        var result = await _certificateService.VerifyCertificateAsync(code);
        if (result == null || !result.IsValid)
        {
            return NotFound(ApiResponse<CertificateVerificationDto>.FailureResponse("Certificate not found or invalid."));
        }

        return Ok(ApiResponse<CertificateVerificationDto>.SuccessResponse(result, "Certificate is valid."));
    }
}
