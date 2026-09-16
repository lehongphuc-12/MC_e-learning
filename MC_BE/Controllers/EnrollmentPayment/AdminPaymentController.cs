using System;
using System.Threading.Tasks;
using MC_BE.DTOs;
using MC_BE.Features.EnrollmentPayment;
using MC_BE.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Controllers.EnrollmentPayment;

[ApiController]
[Authorize]
[Route("api/admin/payments")]
public class AdminPaymentController : ControllerBase
{
    private readonly IAdminPaymentService _adminPaymentService;
    private readonly IEnrollmentService _enrollmentService;
    private readonly ICurrentUserService _currentUserService;

    public AdminPaymentController(
        IAdminPaymentService adminPaymentService,
        IEnrollmentService enrollmentService,
        ICurrentUserService currentUserService)
    {
        _adminPaymentService = adminPaymentService;
        _enrollmentService = enrollmentService;
        _currentUserService = currentUserService;
    }

    /*
     * AD07: Tìm kiếm và lọc danh sách thanh toán
     */
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<PaymentDetailsDto>>>> Search([FromQuery] PaymentFilterRequest filter)
    {
        try
        {
            _currentUserService.RequireAdmin();
            var adminId = int.Parse(_currentUserService.GetUserId());
            var result = await _adminPaymentService.SearchPaymentsAsync(adminId, filter);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<PagedResult<PaymentDetailsDto>>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<PagedResult<PaymentDetailsDto>>.FailureResponse(ex.Message));
        }
    }

    /*
     * AD07: Chi tiết thanh toán
     */
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<PaymentDetailsDto>>> Details(int id)
    {
        try
        {
            _currentUserService.RequireAdmin();
            var adminId = int.Parse(_currentUserService.GetUserId());
            var result = await _adminPaymentService.GetPaymentAsync(adminId, id);

            if (!result.Success)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<PaymentDetailsDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<PaymentDetailsDto>.FailureResponse(ex.Message));
        }
    }

    /*
     * AD06: Đối soát trạng thái thanh toán
     */
    [HttpPost("{id:int}/verify")]
    public async Task<ActionResult<ApiResponse<VerifyPaymentResultDto>>> Verify(int id)
    {
        try
        {
            _currentUserService.RequireAdmin();
            var adminId = int.Parse(_currentUserService.GetUserId());
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

            var result = await _adminPaymentService.VerifyPaymentAsync(adminId, id, ip);
            if (!result.Success)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<VerifyPaymentResultDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<VerifyPaymentResultDto>.FailureResponse(ex.Message));
        }
    }

    /*
     * AD07: Truy vấn trực tiếp từ VNPay
     */
    [HttpPost("{id:int}/retrieve-from-vnpay")]
    public async Task<ActionResult<ApiResponse<VnPayQueryResultDto>>> RetrieveFromVnPay(int id)
    {
        try
        {
            _currentUserService.RequireAdmin();
            var adminId = int.Parse(_currentUserService.GetUserId());
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

            var result = await _adminPaymentService.RetrieveVnPayInformationAsync(adminId, id, ip);
            if (!result.Success)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<VnPayQueryResultDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<VnPayQueryResultDto>.FailureResponse(ex.Message));
        }
    }

    /*
     * LUỒNG 2: Admin thu hồi hoặc hoàn tiền khóa học đã mua
     */
    [HttpPost("enrollments/{enrollmentId:int}/revoke")]
    public async Task<ActionResult<ApiResponse<bool>>> RevokeEnrollment(int enrollmentId, [FromBody] RevokeEnrollmentRequest request)
    {
        try
        {
            _currentUserService.RequireAdmin();
            var result = await _enrollmentService.RevokeEnrollmentByAdminAsync(enrollmentId, request);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message));
        }
    }
}