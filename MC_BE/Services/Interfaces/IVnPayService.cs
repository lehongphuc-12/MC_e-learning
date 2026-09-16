using MC_BE.DTOs;
using MC_BE.Models.Entities;

namespace MC_BE.Services.Interfaces;

public interface IVnPayService
{
    string CreatePaymentUrl(
        Payment payment,
        string ipAddress
    );

    bool ValidateSignature(
        IQueryCollection query
    );

    Task<VnPayQueryResultDto> QueryTransactionAsync(
        Payment payment,
        string ipAddress
    );
}