using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MC_BE.Core.DTOs;

public class CoursePaymentDto
{
    public int CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class CreatePaymentRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int EnrollmentId { get; set; }
}

public class CreateCartPaymentRequest
{
    [Required]
    [MinLength(1)]
    public List<int> EnrollmentIds { get; set; } = new();
}

public class CreatePaymentResponseDto
{
    public int PaymentId { get; set; }

    // Compatibility với checkout 1 khóa hiện tại.
    public int EnrollmentId { get; set; }

    // Cart checkout.
    public List<int> EnrollmentIds { get; set; } = new();
    public List<int> CourseIds { get; set; } = new();

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string Status { get; set; } = string.Empty;
    public string PaymentUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class PaymentItemDto
{
    public int PaymentItemId { get; set; }
    public int EnrollmentId { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string CourseThumbnailUrl { get; set; } = string.Empty;
    public string CourseDescription { get; set; } = string.Empty;
    public string EnrollmentStatus { get; set; } = string.Empty;
    public decimal Amount { get; set; }
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
    public DateTime? ProcessedAt { get; set; }
}

public class PaymentDetailsDto
{
    public int PaymentId { get; set; }
    public int LearnerId { get; set; }
    public string LearnerName { get; set; } = string.Empty;
    public string LearnerEmail { get; set; } = string.Empty;

    // Compatibility với màn hình payment cũ.
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string CourseThumbnailUrl { get; set; } = string.Empty;
    public string CourseDescription { get; set; } = string.Empty;
    public int EnrollmentId { get; set; }
    public string EnrollmentStatus { get; set; } = string.Empty;

    // Danh sách course/enrollment của payment.
    // Checkout 1 khóa => 1 item.
    // Checkout cart => nhiều item.
    public List<PaymentItemDto> Items { get; set; } = new();

    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string MerchantTxnRef { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public PaymentTransactionDto? LatestTransaction { get; set; }
}

public class PaymentFilterRequest
{
    [StringLength(100)]
    public string? Keyword { get; set; }

    public string? Status { get; set; }

    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? MinAmount { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? MaxAmount { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}

public class VerifyPaymentResultDto
{
    public bool Valid { get; set; }
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? TransactionStatus { get; set; }
    public List<string> Issues { get; set; } = new();
    public PaymentDetailsDto? Payment { get; set; }
    public PayOsQueryResultDto? PayOs { get; set; }
}