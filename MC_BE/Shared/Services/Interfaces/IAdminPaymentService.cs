using MC_BE.Core.DTOs;

namespace MC_BE.Shared.Services.Interfaces;

public interface IAdminPaymentService
{
    Task<ApiResponse<PagedResult<PaymentDetailsDto>>> SearchPaymentsAsync(
        int currentUserId,
        PaymentFilterRequest filter
    );

    Task<ApiResponse<PaymentDetailsDto>> GetPaymentAsync(
        int currentUserId,
        int paymentId
    );

    Task<ApiResponse<VerifyPaymentResultDto>> VerifyPaymentAsync(
        int currentUserId,
        int paymentId
    );

    Task<ApiResponse<PayOsQueryResultDto>> RetrievePayOsInformationAsync(
        int currentUserId,
        int paymentId
    );
}