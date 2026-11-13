namespace MC_BE.Shared.Services.Interfaces;

public sealed record PayOsTransactionRecordResult(bool IsAccepted, int? ExistingPaymentId);

/// <summary>
/// Idempotently records a successful PayOS reference while the caller's database transaction is active.
/// </summary>
public interface IPayOsTransactionRecorder
{
    Task<PayOsTransactionRecordResult> RecordSuccessfulAsync(
        int paymentId,
        string? providerReference,
        decimal amount,
        string? responseCode,
        string? bankCode,
        bool signatureValid,
        DateTime processedAt);
}
