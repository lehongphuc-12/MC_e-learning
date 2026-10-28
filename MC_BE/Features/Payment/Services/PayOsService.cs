using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.Extensions.Options;
using PayOS;
using PayOS.Models;
using PayOS.Models.V2.PaymentRequests;
using PayOS.Models.Webhooks;

namespace MC_BE.Shared.Services;

public class PayOsService : IPayOsService
{
    private readonly PayOSClient _client;
    private readonly PayOsSettings _settings;

    public PayOsService(IOptions<PayOsSettings> options)
    {
        _settings = options.Value;

        if (string.IsNullOrWhiteSpace(_settings.ClientId))
            throw new InvalidOperationException("Thiếu PayOS:ClientId.");

        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            throw new InvalidOperationException("Thiếu PayOS:ApiKey.");

        if (string.IsNullOrWhiteSpace(_settings.ChecksumKey))
            throw new InvalidOperationException("Thiếu PayOS:ChecksumKey.");

        if (string.IsNullOrWhiteSpace(_settings.ReturnUrl))
            throw new InvalidOperationException("Thiếu PayOS:ReturnUrl.");

        if (string.IsNullOrWhiteSpace(_settings.CancelUrl))
            throw new InvalidOperationException("Thiếu PayOS:CancelUrl.");

        _client = new PayOSClient(new PayOSOptions
        {
            ClientId = _settings.ClientId,
            ApiKey = _settings.ApiKey,
            ChecksumKey = _settings.ChecksumKey
        });
    }

    public async Task<PayOsCreateResultDto> CreatePaymentLinkAsync(Payment payment)
    {
        if (!long.TryParse(payment.MerchantTxnRef, out var orderCode))
            throw new InvalidOperationException(
                "MerchantTxnRef phải là orderCode dạng số.");

        if (payment.Amount <= 0 ||
            payment.Amount > int.MaxValue ||
            payment.Amount != decimal.Truncate(payment.Amount))
        {
            throw new InvalidOperationException(
                "Số tiền thanh toán payOS không hợp lệ.");
        }

        var description = $"MC{payment.PaymentId}";

        if (description.Length > 9)
            description = description[..9];

        var request = new CreatePaymentLinkRequest
        {
            OrderCode = orderCode,
            Amount = checked((int)payment.Amount),
            Description = description,
            ReturnUrl = _settings.ReturnUrl,
            CancelUrl = _settings.CancelUrl
        };

        var result = await _client.PaymentRequests.CreateAsync(
            request,
            new RequestOptions<CreatePaymentLinkRequest>());

        return new PayOsCreateResultDto
        {
            OrderCode = orderCode,
            PaymentLinkId = result.PaymentLinkId ?? string.Empty,
            CheckoutUrl = result.CheckoutUrl ?? string.Empty,
            QrCode = result.QrCode ?? string.Empty,
            Status = result.Status.ToString()
        };
    }

    public async Task<PayOsQueryResultDto> GetPaymentInformationAsync(
        long orderCode)
    {
        try
        {
            var result = await _client.PaymentRequests.GetAsync(
                orderCode,
                new RequestOptions());

            var latestTransaction = result.Transactions?
                .OrderByDescending(x => x.TransactionDateTime)
                .FirstOrDefault();

            return new PayOsQueryResultDto
            {
                RequestSucceeded = true,
                OrderCode = result.OrderCode,
                Amount = result.Amount,
                AmountPaid = result.AmountPaid,
                AmountRemaining = result.AmountRemaining,
                Status = result.Status.ToString(),
                PaymentLinkId = result.Id,
                Reference = latestTransaction?.Reference,
                CancellationReason = result.CancellationReason,
                Message = "success"
            };
        }
        catch (Exception ex)
        {
            return new PayOsQueryResultDto
            {
                RequestSucceeded = false,
                OrderCode = orderCode,
                Message = ex.Message
            };
        }
    }

    public async Task<WebhookData> VerifyWebhookAsync(Webhook webhook)
    {
        if (webhook == null)
            throw new ArgumentNullException(nameof(webhook));

        return await _client.Webhooks.VerifyAsync(webhook);
    }

    public async Task<string> ConfirmWebhookAsync()
    {
        if (string.IsNullOrWhiteSpace(_settings.WebhookUrl))
            throw new InvalidOperationException(
                "Thiếu PayOS:WebhookUrl.");

        var result = await _client.Webhooks.ConfirmAsync(
            _settings.WebhookUrl,
            new RequestOptions<ConfirmWebhookRequest>());

        return result.WebhookUrl ?? _settings.WebhookUrl;
    }
}