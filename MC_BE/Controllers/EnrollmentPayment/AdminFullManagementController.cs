using System;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
public class AdminFullManagementController : ControllerBase
{
    private readonly IAdminPaymentService _adminPaymentService;
    private readonly ICurrentUserService _currentUserService;

    public AdminFullManagementController(
        IAdminPaymentService adminPaymentService,
        ICurrentUserService currentUserService)
    {
        _adminPaymentService = adminPaymentService;
        _currentUserService = currentUserService;
    }

    // ============================================================
    // AD07 - DANH SÁCH THANH TOÁN
    // GET /api/v1/admin/payments
    // ============================================================

    [HttpGet("api/v1/admin/payments")]
    public async Task<ActionResult<ApiResponse<PagedResult<PaymentDetailsDto>>>> GetPayments(
        [FromQuery] PaymentFilterRequest filter)
    {
        if (!TryGetCurrentUserId(out var adminUserId))
        {
            return Unauthorized(
                ApiResponse<PagedResult<PaymentDetailsDto>>.FailureResponse(
                    "Không xác định được người dùng hiện tại."));
        }

        var result = await _adminPaymentService.SearchPaymentsAsync(adminUserId, filter);
        return Ok(result);
    }

    // ============================================================
    // AD07 - CHI TIẾT THANH TOÁN
    // GET /api/v1/admin/payments/{id}
    // ============================================================

    [HttpGet("api/v1/admin/payments/{id:int}")]
    public async Task<ActionResult<ApiResponse<PaymentDetailsDto>>> GetPayment(int id)
    {
        if (!TryGetCurrentUserId(out var adminUserId))
        {
            return Unauthorized(
                ApiResponse<PaymentDetailsDto>.FailureResponse(
                    "Không xác định được người dùng hiện tại."));
        }

        var result = await _adminPaymentService.GetPaymentAsync(adminUserId, id);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    // ============================================================
    // AD06 - ĐỐI SOÁT THANH TOÁN VỚI VNPAY
    // POST /api/v1/admin/payments/{id}/verify
    // ============================================================

    [HttpPost("api/v1/admin/payments/{id:int}/verify")]
    public async Task<ActionResult<ApiResponse<VerifyPaymentResultDto>>> VerifyPayment(int id)
    {
        if (!TryGetCurrentUserId(out var adminUserId))
        {
            return Unauthorized(
                ApiResponse<VerifyPaymentResultDto>.FailureResponse(
                    "Không xác định được người dùng hiện tại."));
        }

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        var result = await _adminPaymentService.VerifyPaymentAsync(adminUserId, id, ipAddress);

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    // ============================================================
    // PRIVATE
    // ============================================================

    private bool TryGetCurrentUserId(out int userId)
    {
        var raw = _currentUserService.GetUserId();
        return int.TryParse(raw, out userId);
    }
}