using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Controllers.EnrollmentPayment;

[ApiController]
[Route("api/v1/admin")]
[Authorize]
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

    [HttpGet("payments")]
    public async Task<ActionResult<ApiResponse<PagedResult<PaymentDetailsDto>>>> SearchPayments([FromQuery] PaymentFilterRequest filter)
    {
        _currentUserService.RequireAdmin();
        var userId = int.Parse(_currentUserService.GetUserId());

        var response = await _adminPaymentService.SearchPaymentsAsync(userId, filter);
        return Ok(response);
    }

    [HttpGet("payments/{paymentId:int}")]
    public async Task<ActionResult<ApiResponse<PaymentDetailsDto>>> GetPayment(int paymentId)
    {
        _currentUserService.RequireAdmin();
        var userId = int.Parse(_currentUserService.GetUserId());

        var response = await _adminPaymentService.GetPaymentAsync(userId, paymentId);
        if (!response.Success)
        {
            return NotFound(response);
        }

        return Ok(response);
    }

    [HttpPost("payments/{paymentId:int}/verify")]
    public async Task<ActionResult<ApiResponse<VerifyPaymentResultDto>>> VerifyPayment(int paymentId)
    {
        _currentUserService.RequireAdmin();
        var userId = int.Parse(_currentUserService.GetUserId());
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        var response = await _adminPaymentService.VerifyPaymentAsync(userId, paymentId, ipAddress);
        if (!response.Success)
        {
            return NotFound(response);
        }

        return Ok(response);
    }

    [HttpGet("payments/{paymentId:int}/vnpay-query")]
    public async Task<ActionResult<ApiResponse<VnPayQueryResultDto>>> RetrieveVnPayInfo(int paymentId)
    {
        _currentUserService.RequireAdmin();
        var userId = int.Parse(_currentUserService.GetUserId());
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        var response = await _adminPaymentService.RetrieveVnPayInformationAsync(userId, paymentId, ipAddress);
        if (!response.Success)
        {
            return NotFound(response);
        }

        return Ok(response);
    }

    [HttpPost("enrollments/{enrollmentId:int}/revoke")]
    public async Task<ActionResult<ApiResponse<bool>>> RevokeEnrollment(int enrollmentId, [FromBody] RevokeEnrollmentRequest request)
    {
        _currentUserService.RequireAdmin();

        var response = await _enrollmentService.RevokeEnrollmentByAdminAsync(enrollmentId, request);
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }
}