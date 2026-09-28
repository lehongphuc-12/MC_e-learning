using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using PayOS.Models.Webhooks;

namespace MC_BE.Shared.Services.Interfaces;

public interface IPayOsService
{
    Task<PayOsCreateResultDto> CreatePaymentLinkAsync(Payment payment);

    Task<PayOsQueryResultDto> GetPaymentInformationAsync(long orderCode);

    Task<WebhookData> VerifyWebhookAsync(Webhook webhook);

    Task<string> ConfirmWebhookAsync();
}