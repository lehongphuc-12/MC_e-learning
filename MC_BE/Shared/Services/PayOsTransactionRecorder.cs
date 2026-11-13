using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Shared.Services;

/// <summary>
/// Uses PostgreSQL's unique index as the atomic idempotency boundary. A read-then-insert check alone
/// is not safe because a webhook and a payment-sync request can race between those two operations.
/// </summary>
public sealed class PayOsTransactionRecorder(SmartMcDbContext context) : IPayOsTransactionRecorder
{
    public async Task<PayOsTransactionRecordResult> RecordSuccessfulAsync(
        int paymentId,
        string? providerReference,
        decimal amount,
        string? responseCode,
        string? bankCode,
        bool signatureValid,
        DateTime processedAt)
    {
        var reference = string.IsNullOrWhiteSpace(providerReference)
            ? null
            : providerReference.Trim();

        // PayOS normally supplies a reference. Preserve the existing behavior if it does not.
        if (reference is null)
            return new PayOsTransactionRecordResult(true, null);

        // This INSERT is atomic with respect to the unique ProviderTransactionNo index. Concurrent
        // callbacks either insert once or wait and observe the winner; they do not raise 23505.
        await context.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT INTO payment_transactions
                (""PaymentID"", ""Provider"", ""ProviderTransactionNo"", ""ResponseCode"",
                 ""TransactionStatus"", ""BankCode"", ""Amount"", ""Status"",
                 ""SignatureValid"", ""ProcessedAt"", ""CreatedAt"")
            VALUES
                ({paymentId}, {"PAYOS"}, {reference}, {responseCode}, {"PAID"}, {bankCode}, {amount},
                 {"SUCCESS"}, {signatureValid}, {processedAt}, {processedAt})
            ON CONFLICT DO NOTHING");

        // The index is global on ProviderTransactionNo, so verify both provider and owning payment.
        var existing = await context.PaymentTransactions
            .FirstOrDefaultAsync(t => t.ProviderTransactionNo == reference);

        if (existing is null || existing.Provider != "PAYOS" || existing.PaymentId != paymentId)
            return new PayOsTransactionRecordResult(false, existing?.PaymentId);

        // If an earlier attempt created a non-final row for the same payment, reconcile it to the
        // provider-confirmed success without weakening a previously verified webhook signature.
        existing.ResponseCode = responseCode ?? existing.ResponseCode;
        existing.TransactionStatus = "PAID";
        existing.BankCode = bankCode ?? existing.BankCode;
        existing.Amount = amount;
        existing.Status = "SUCCESS";
        existing.SignatureValid |= signatureValid;
        existing.ProcessedAt = processedAt;

        return new PayOsTransactionRecordResult(true, existing.PaymentId);
    }
}
