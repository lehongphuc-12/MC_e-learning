using System.Security.Claims;
using MC_BE.DTOs;
using MC_BE.Helpers;
using MC_BE.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MC_BE.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly VnPaySettings _vnPaySettings;

    public PaymentController(
        IPaymentService paymentService,
        IOptions<VnPaySettings> vnPaySettings)
    {
        _paymentService =
            paymentService;

        _vnPaySettings =
            vnPaySettings.Value;
    }

    // LE03
    [Authorize]
    [HttpPost]
    public async Task<
        ActionResult<
            ApiResponse<CreatePaymentResponseDto>
        >
    > CreatePayment(
        [FromBody]
        CreatePaymentRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors =
                ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage)
                    .ToList();

            return BadRequest(
                ApiResponse<CreatePaymentResponseDto>
                    .FailureResponse(
                        "Validation failed.",
                        errors
                    )
            );
        }

        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(
                ApiResponse<CreatePaymentResponseDto>
                    .FailureResponse(
                        "Invalid user token."
                    )
            );
        }

        var ip =
            HttpContext.Connection
                .RemoteIpAddress?
                .ToString()
            ??
            "127.0.0.1";

        var result =
            await _paymentService
                .CreatePaymentAsync(
                    userId,
                    request,
                    ip
                );

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [Authorize]
    [HttpGet("my/{paymentId:int}")]
    public async Task<
        ActionResult<
            ApiResponse<PaymentDetailsDto>
        >
    > GetMyPayment(int paymentId)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(
                ApiResponse<PaymentDetailsDto>
                    .FailureResponse(
                        "Invalid user token."
                    )
            );
        }

        var result =
            await _paymentService
                .GetMyPaymentAsync(
                    userId,
                    paymentId
                );

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("vnpay-return")]
    public async Task<IActionResult>
        VnPayReturn()
    {
        var result =
            await _paymentService
                .ProcessVnPayResultAsync(
                    Request.Query
                );

        if (!result.Success)
        {
            return Redirect(
                $"{_vnPaySettings.FrontendResultUrl}" +
                "?error=" +
                Uri.EscapeDataString(
                    result.Message
                )
            );
        }

        return Redirect(
            $"{_vnPaySettings.FrontendResultUrl}" +
            $"?paymentId={result.Data!.PaymentId}" +
            $"&status={Uri.EscapeDataString(result.Data.PaymentStatus)}"
        );
    }

    private bool TryGetUserId(
        out int userId)
    {
        var claim =
            User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

        return int.TryParse(
            claim,
            out userId
        );
    }
}