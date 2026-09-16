using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Shared.Services.Interfaces;

public interface IPaymentService
{
    Task<ApiResponse<CreatePaymentResponseDto>> CreatePaymentAsync(int currentUserId, CreatePaymentRequest request, string ipAddress);
    Task<ApiResponse<PaymentDetailsDto>> GetMyPaymentAsync(int currentUserId, int paymentId);
    Task<ApiResponse<PaymentDetailsDto>> ProcessVnPayResultAsync(IQueryCollection query);
}