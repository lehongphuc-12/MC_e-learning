using MC_BE.Core.DTOs;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayOS.Models.Webhooks;

namespace MC_BE.Controllers.EnrollmentPayment;

[ApiController]
[Route("api/v1/payments")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ICurrentUserService _currentUserService;

    public PaymentController(IPaymentService paymentService, ICurrentUserService currentUserService)
    {
        _paymentService = paymentService;
        _currentUserService = currentUserService;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CreatePaymentResponseDto>>> CreatePayment([FromBody] CreatePaymentRequest request)
    {
        _currentUserService.RequireLearner();

        if (!int.TryParse(_currentUserService.GetUserId(), out var userId))
            return Unauthorized(ApiResponse<CreatePaymentResponseDto>.FailureResponse("Không xác định được người dùng."));

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var result = await _paymentService.CreatePaymentAsync(userId, request, ipAddress);

        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("cart")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CreatePaymentResponseDto>>> CreateCartPayment([FromBody] CreateCartPaymentRequest request)
    {
        _currentUserService.RequireLearner();

        if (!int.TryParse(_currentUserService.GetUserId(), out var userId))
            return Unauthorized(ApiResponse<CreatePaymentResponseDto>.FailureResponse("Không xác định được người dùng."));

        if (request.EnrollmentIds == null || request.EnrollmentIds.Count == 0)
            return BadRequest(ApiResponse<CreatePaymentResponseDto>.FailureResponse("Giỏ hàng không có khóa học để thanh toán."));

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var result = await _paymentService.CreateCartPaymentAsync(userId, request.EnrollmentIds, ipAddress);

        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("my-history")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<PagedResult<PaymentDetailsDto>>>> GetMyPaymentHistory([FromQuery] PaymentFilterRequest filter)
    {
        _currentUserService.RequireLearner();

        if (!int.TryParse(_currentUserService.GetUserId(), out var userId))
            return Unauthorized(ApiResponse<PagedResult<PaymentDetailsDto>>.FailureResponse("Không xác định được người dùng."));

        var result = await _paymentService.GetMyPaymentHistoryAsync(userId, filter);

        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("{paymentId:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<PaymentDetailsDto>>> GetMyPayment(int paymentId)
    {
        _currentUserService.RequireLearner();

        if (!int.TryParse(_currentUserService.GetUserId(), out var userId))
            return Unauthorized(ApiResponse<PaymentDetailsDto>.FailureResponse("Không xác định được người dùng."));

        var result = await _paymentService.GetMyPaymentAsync(userId, paymentId);

        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost("{paymentId:int}/sync")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<PaymentDetailsDto>>> SyncMyPayment(int paymentId)
    {
        _currentUserService.RequireLearner();

        if (!int.TryParse(_currentUserService.GetUserId(), out var userId))
            return Unauthorized(ApiResponse<PaymentDetailsDto>.FailureResponse("Không xác định được người dùng."));

        var result = await _paymentService.SyncMyPaymentAsync(userId, paymentId);

        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("payos-webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> PayOsWebhook([FromBody] Webhook webhook)
    {
        try
        {
            var processed = await _paymentService.ProcessPayOsWebhookAsync(webhook);

            if (!processed)
                return BadRequest(new
                {
                    success = false,
                    message = "Webhook payOS không hợp lệ."
                });

            return Ok(new { success = true });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Không thể xử lý webhook."
            });
        }
    }

    [HttpPost("confirm-webhook")]
    [Authorize]
    public async Task<IActionResult> ConfirmWebhook([FromServices] IPayOsService payOsService)
    {
        _currentUserService.RequireAdmin();

        try
        {
            var webhookUrl = await payOsService.ConfirmWebhookAsync();

            return Ok(new
            {
                success = true,
                message = "Đăng ký webhook payOS thành công.",
                webhookUrl
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
    }
}