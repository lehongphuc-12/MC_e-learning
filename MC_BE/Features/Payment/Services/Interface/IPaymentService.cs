using MC_BE.Core.DTOs;
using PayOS.Models.Webhooks;

namespace MC_BE.Shared.Services.Interfaces;

public interface IPaymentService
{
    Task<ApiResponse<CreatePaymentResponseDto>> CreatePaymentAsync(
        int currentUserId,
        CreatePaymentRequest request,
        string ipAddress
    );

    Task<bool> ProcessPayOsWebhookAsync(
        Webhook webhook
    );

    Task<ApiResponse<PaymentDetailsDto>> GetMyPaymentAsync(
        int currentUserId,
        int paymentId
    );

    Task<ApiResponse<PagedResult<PaymentDetailsDto>>> GetMyPaymentHistoryAsync(
        int currentUserId,
        PaymentFilterRequest filter
    );
}