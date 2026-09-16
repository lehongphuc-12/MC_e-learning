using MC_BE.DTOs;

namespace MC_BE.Services.Interfaces;

public interface IPaymentService
{
    Task<ApiResponse<CreatePaymentResponseDto>>
        CreatePaymentAsync(
            int currentUserId,
            CreatePaymentRequest request,
            string ipAddress
        );

    Task<ApiResponse<PaymentDetailsDto>>
        GetMyPaymentAsync(
            int currentUserId,
            int paymentId
        );

    Task<ApiResponse<PaymentDetailsDto>>
        ProcessVnPayResultAsync(
            IQueryCollection query
        );
}