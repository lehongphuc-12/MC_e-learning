using System;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MC_BE.Controllers.EnrollmentPayment;

[ApiController]
[Route("api/v1/payments")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ICurrentUserService _currentUserService;
    private readonly VnPaySettings _vnPaySettings;

    public PaymentController(
        IPaymentService paymentService,
        ICurrentUserService currentUserService,
        IOptions<VnPaySettings> vnPayOptions)
    {
        _paymentService = paymentService;
        _currentUserService = currentUserService;
        _vnPaySettings = vnPayOptions.Value;
    }

    // ============================================================
    // CREATE PAYMENT
    // POST /api/v1/payments
    // ============================================================

    [HttpPost]
    [Authorize]
    public async Task<
        ActionResult<
            ApiResponse<CreatePaymentResponseDto>
        >
    > CreatePayment(
        [FromBody] CreatePaymentRequest request)
    {
        _currentUserService.RequireLearner();

        var userId =
            int.Parse(
                _currentUserService.GetUserId()
            );

        var ipAddress =
            HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? "127.0.0.1";

        var response =
            await _paymentService.CreatePaymentAsync(
                userId,
                request,
                ipAddress
            );

        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    // ============================================================
    // GET MY PAYMENT
    // GET /api/v1/payments/{paymentId}
    // ============================================================

    [HttpGet("{paymentId:int}")]
    [Authorize]
    public async Task<
        ActionResult<
            ApiResponse<PaymentDetailsDto>
        >
    > GetMyPayment(
        int paymentId)
    {
        var userId =
            int.Parse(
                _currentUserService.GetUserId()
            );

        var response =
            await _paymentService.GetMyPaymentAsync(
                userId,
                paymentId
            );

        if (!response.Success)
        {
            return NotFound(response);
        }

        return Ok(response);
    }

    // ============================================================
    // VNPAY RETURN
    // GET /api/v1/payments/vnpay-return
    // ============================================================

    [HttpGet("vnpay-return")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayReturn()
    {
        var result =
            await _paymentService.ProcessVnPayResultAsync(
                Request.Query
            );

        if (
            !string.IsNullOrWhiteSpace(
                _vnPaySettings.FrontendResultUrl
            )
        )
        {
            var paymentId =
                result.Data?.PaymentId;

            var status =
                result.Data?.PaymentStatus ??
                "FAILED";

            var success =
                result.Success &&
                string.Equals(
                    status,
                    "SUCCESS",
                    StringComparison.OrdinalIgnoreCase
                );

            var redirectUrl =
                $"{_vnPaySettings.FrontendResultUrl}" +
                $"?success={success.ToString().ToLowerInvariant()}" +
                $"&paymentId={paymentId}" +
                $"&status={status}";

            return Redirect(redirectUrl);
        }

        return Ok(result);
    }
}