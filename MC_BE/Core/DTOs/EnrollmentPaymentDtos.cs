using System;
using System.Collections.Generic;

namespace MC_BE.Core.DTOs;

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class PaymentFilterRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Status { get; set; }
    public string? Keyword { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
}

public class CreatePaymentRequest
{
    public int EnrollmentId { get; set; }
}

public class CreatePaymentResponseDto
{
    public int PaymentId { get; set; }
    public int EnrollmentId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string Status { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class PaymentTransactionDto
{
    public int TransactionId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string? ProviderTransactionNo { get; set; }
    public string? ResponseCode { get; set; }
    public string? TransactionStatus { get; set; }
    public string? BankCode { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool SignatureValid { get; set; }
    public DateTime ProcessedAt { get; set; }
}

public class PaymentDetailsDto
{
    public int PaymentId { get; set; }
    public int LearnerId { get; set; }
    public string LearnerName { get; set; } = string.Empty;
    public string LearnerEmail { get; set; } = string.Empty;
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string CourseThumbnailUrl { get; set; } = string.Empty;
    public string CourseDescription { get; set; } = string.Empty;
    public int EnrollmentId { get; set; }
    public string EnrollmentStatus { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string PaymentMethod { get; set; } = "VNPAY";
    public string PaymentStatus { get; set; } = string.Empty;
    public string MerchantTxnRef { get; set; } = string.Empty;
    public string? VnPayTransactionNo { get; set; }
    public string? VnPayResponseCode { get; set; }
    public string? VnPayTransactionStatus { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public PaymentTransactionDto? LatestTransaction { get; set; }
}

public class VerifyPaymentResultDto
{
    public bool Valid { get; set; }
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? TransactionStatus { get; set; }
    public List<string> Issues { get; set; } = new();
    public PaymentDetailsDto? Payment { get; set; }
    public VnPayQueryResultDto? VnPay { get; set; }
}

public class VnPayQueryResultDto
{
    public bool RequestSucceeded { get; set; }
    public string? ResponseCode { get; set; }
    public string? Message { get; set; }
    public string? TransactionStatus { get; set; }
    public string? TransactionNo { get; set; }
    public string? BankCode { get; set; }
    public decimal? Amount { get; set; }
    public string? RawResponse { get; set; }
}

public class EnrollmentDto
{
    public int EnrollmentId { get; set; }
    public int LearnerId { get; set; }
    public int CourseId { get; set; }
    public int? PaymentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal CompletionPercentage { get; set; }
    public DateTime? EnrolledAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RevokeEnrollmentRequest
{
    public string Reason { get; set; } = string.Empty;
    public bool IsRefunded { get; set; }
}

public class CoursePaymentDto
{
    public int CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ThumbnailUrl { get; set; }
    public decimal Price { get; set; }
    public string Status { get; set; } = string.Empty;
}