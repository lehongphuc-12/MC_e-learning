using MC_BE.DTOs;

namespace MC_BE.Services.Interfaces;

public interface IAdminPaymentService
{
    Task<ApiResponse<PagedResult<PaymentDetailsDto>>>
        SearchPaymentsAsync(
            int currentUserId,
            PaymentFilterRequest filter
        );

    Task<ApiResponse<PaymentDetailsDto>>
        GetPaymentAsync(
            int currentUserId,
            int paymentId
        );

    Task<ApiResponse<VerifyPaymentResultDto>>
        VerifyPaymentAsync(
            int currentUserId,
            int paymentId,
            string ipAddress
        );

    Task<ApiResponse<VnPayQueryResultDto>>
        RetrieveVnPayInformationAsync(
            int currentUserId,
            int paymentId,
            string ipAddress
        );
}