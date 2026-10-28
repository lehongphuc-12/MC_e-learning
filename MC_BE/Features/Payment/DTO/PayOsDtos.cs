namespace MC_BE.Core.DTOs;

public class PayOsCreateResultDto
{
    public long OrderCode { get; set; }
    public string PaymentLinkId { get; set; } = string.Empty;
    public string CheckoutUrl { get; set; } = string.Empty;
    public string QrCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class PayOsWebhookRequestDto
{
    public string Code { get; set; } = string.Empty;
    public string Desc { get; set; } = string.Empty;
    public bool Success { get; set; }
    public PayOsWebhookDataDto Data { get; set; } = new();
    public string Signature { get; set; } = string.Empty;
}

public class PayOsWebhookDataDto
{
    public long OrderCode { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public string? AccountNumber { get; set; }
    public string? Reference { get; set; }
    public string? TransactionDateTime { get; set; }
    public string? Currency { get; set; }
    public string? PaymentLinkId { get; set; }
    public string? Code { get; set; }
    public string? Desc { get; set; }
    public string? CounterAccountBankId { get; set; }
    public string? CounterAccountBankName { get; set; }
    public string? CounterAccountName { get; set; }
    public string? CounterAccountNumber { get; set; }
    public string? VirtualAccountName { get; set; }
    public string? VirtualAccountNumber { get; set; }
}

public class PayOsVerifiedWebhookDto
{
    public long OrderCode { get; set; }
    public decimal Amount { get; set; }
    public string? Reference { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? AccountNumber { get; set; }
    public string? CounterAccountBankId { get; set; }
    public string? TransactionDateTime { get; set; }
}

public class PayOsQueryResultDto
{
    public bool RequestSucceeded { get; set; }
    public long OrderCode { get; set; }
    public decimal Amount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal AmountRemaining { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PaymentLinkId { get; set; }
    public string? Reference { get; set; }
    public string? CancellationReason { get; set; }
    public string Message { get; set; } = string.Empty;
}