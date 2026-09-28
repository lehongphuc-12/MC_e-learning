using MC_BE.Core.DTOs;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Tags("Admin Payment")]
public class AdminPaymentController : ControllerBase
{
    private readonly IAdminPaymentService _adminPaymentService;
    private readonly ICurrentUserService _currentUserService;

    public AdminPaymentController(
        IAdminPaymentService adminPaymentService,
        ICurrentUserService currentUserService)
    {
        _adminPaymentService = adminPaymentService;
        _currentUserService = currentUserService;
    }

    [HttpGet("api/v1/admin/payments")]
    public async Task<ActionResult<ApiResponse<PagedResult<PaymentDetailsDto>>>> GetPayments(
        [FromQuery] PaymentFilterRequest filter)
    {
        if (!TryGetCurrentUserId(out var adminUserId))
        {
            return Unauthorized(
                ApiResponse<PagedResult<PaymentDetailsDto>>
                    .FailureResponse(
                        "Không xác định được người dùng hiện tại."));
        }

        return Ok(
            await _adminPaymentService.SearchPaymentsAsync(
                adminUserId,
                filter));
    }

    [HttpGet("api/v1/admin/payments/{id:int}")]
    public async Task<ActionResult<ApiResponse<PaymentDetailsDto>>> GetPayment(
        int id)
    {
        if (!TryGetCurrentUserId(out var adminUserId))
        {
            return Unauthorized(
                ApiResponse<PaymentDetailsDto>
                    .FailureResponse(
                        "Không xác định được người dùng hiện tại."));
        }

        var result =
            await _adminPaymentService.GetPaymentAsync(
                adminUserId,
                id);

        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }

    // Admin đối soát trực tiếp với payOS
    [HttpPost("api/v1/admin/payments/{id:int}/verify")]
    public async Task<ActionResult<ApiResponse<VerifyPaymentResultDto>>> VerifyPayment(
        int id)
    {
        if (!TryGetCurrentUserId(out var adminUserId))
        {
            return Unauthorized(
                ApiResponse<VerifyPaymentResultDto>
                    .FailureResponse(
                        "Không xác định được người dùng hiện tại."));
        }

        var result =
            await _adminPaymentService.VerifyPaymentAsync(
                adminUserId,
                id);

        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }

    [HttpGet("api/v1/admin/payments/{id:int}/payos")]
    public async Task<ActionResult<ApiResponse<PayOsQueryResultDto>>> GetPayOsInformation(
        int id)
    {
        if (!TryGetCurrentUserId(out var adminUserId))
        {
            return Unauthorized(
                ApiResponse<PayOsQueryResultDto>
                    .FailureResponse(
                        "Không xác định được người dùng hiện tại."));
        }

        var result =
            await _adminPaymentService
                .RetrievePayOsInformationAsync(
                    adminUserId,
                    id);

        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }

    private bool TryGetCurrentUserId(
        out int userId)
    {
        return int.TryParse(
            _currentUserService.GetUserId(),
            out userId);
    }
}