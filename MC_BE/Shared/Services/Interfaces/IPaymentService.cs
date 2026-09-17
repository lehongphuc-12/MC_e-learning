using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using MC_BE.Core.DTOs;

namespace MC_BE.Shared.Services.Interfaces;

public interface IPaymentService
{
    Task<ApiResponse<CreatePaymentResponseDto>> CreatePaymentAsync(
        int currentUserId,
        CreatePaymentRequest request,
        string ipAddress
    );

    Task<ApiResponse<PaymentDetailsDto>> ProcessVnPayResultAsync(
        IQueryCollection query
    );

    Task<ApiResponse<PaymentDetailsDto>> GetMyPaymentAsync(
        int currentUserId,
        int paymentId
    );
}