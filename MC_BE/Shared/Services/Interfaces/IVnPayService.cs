using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Shared.Services.Interfaces;

public interface IVnPayService
{
    string CreatePaymentUrl(Payment payment, string ipAddress);
    bool ValidateSignature(IQueryCollection query);
    Task<VnPayQueryResultDto> QueryTransactionAsync(Payment payment, string ipAddress);
}