using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Data;
using MC_BE.DTOs;
using MC_BE.Models.Entities;
using MC_BE.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Services;

public class AdminPaymentService : IAdminPaymentService
{
    private readonly SmartMcDbContext _context;
    private readonly IVnPayService _vnPayService;
    private readonly ICourseCatalogService _courseCatalog;

    public AdminPaymentService(
        SmartMcDbContext context,
        IVnPayService vnPayService,
        ICourseCatalogService courseCatalog)
    {
        _context = context;
        _vnPayService = vnPayService;
        _courseCatalog = courseCatalog;
    }

    public async Task<ApiResponse<PagedResult<PaymentDetailsDto>>> SearchPaymentsAsync(int currentUserId, PaymentFilterRequest filter)
    {
        var query = _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(p => p.Status.ToUpper() == filter.Status.ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var kw = filter.Keyword.Trim().ToLower();
            query = query.Where(p =>
                p.MerchantTxnRef.ToLower().Contains(kw) ||
                (p.VnPayTransactionNo != null && p.VnPayTransactionNo.ToLower().Contains(kw)) ||
                p.Learner.FullName.ToLower().Contains(kw) ||
                p.Learner.Email.ToLower().Contains(kw));
        }

        if (filter.FromDate.HasValue)
        {
            var fromUtc = filter.FromDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(p => p.CreatedAt >= fromUtc);
        }

        if (filter.ToDate.HasValue)
        {
            var toUtc = filter.ToDate.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            query = query.Where(p => p.CreatedAt <= toUtc);
        }

        if (filter.MinAmount.HasValue)
        {
            query = query.Where(p => p.Amount >= filter.MinAmount.Value);
        }

        if (filter.MaxAmount.HasValue)
        {
            query = query.Where(p => p.Amount <= filter.MaxAmount.Value);
        }

        var totalItems = await query.CountAsync();
        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var payments = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var courses = (await _courseCatalog.GetPublishedCoursesAsync()).ToDictionary(c => c.CourseId);

        var items = payments.Select(p =>
        {
            courses.TryGetValue(p.CourseId, out var c);
            return MapToDetailsDto(p, c);
        }).ToList();

        var result = new PagedResult<PaymentDetailsDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling((double)totalItems / pageSize)
        };

        return ApiResponse<PagedResult<PaymentDetailsDto>>.SuccessResponse(result);
    }

    public async Task<ApiResponse<PaymentDetailsDto>> GetPaymentAsync(int currentUserId, int paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
        {
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Payment not found.");
        }

        var course = await _courseCatalog.GetCourseByIdAsync(payment.CourseId);
        return ApiResponse<PaymentDetailsDto>.SuccessResponse(MapToDetailsDto(payment, course));
    }

    public async Task<ApiResponse<VerifyPaymentResultDto>> VerifyPaymentAsync(int currentUserId, int paymentId, string ipAddress)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
        {
            return ApiResponse<VerifyPaymentResultDto>.FailureResponse("Payment not found.");
        }

        var issues = new List<string>();
        VnPayQueryResultDto? vnpayResult = null;

        try
        {
            vnpayResult = await _vnPayService.QueryTransactionAsync(payment, ipAddress);
            if (!vnpayResult.RequestSucceeded)
            {
                issues.Add($"VNPay query returned error: {vnpayResult.Message ?? vnpayResult.ResponseCode}");
            }
            else
            {
                if (vnpayResult.Amount.HasValue && vnpayResult.Amount.Value != payment.Amount)
                {
                    issues.Add($"Amount mismatch! System: {payment.Amount}, VNPay: {vnpayResult.Amount.Value}");
                }

                var vnpaySuccess = vnpayResult.TransactionStatus == "00";
                var systemSuccess = payment.Status == "SUCCESS";
                if (vnpaySuccess != systemSuccess)
                {
                    issues.Add($"Status mismatch! System: {payment.Status}, VNPay Status: {vnpayResult.TransactionStatus}");
                }
            }
        }
        catch (Exception ex)
        {
            issues.Add($"Failed to communicate with VNPay: {ex.Message}");
        }

        var course = await _courseCatalog.GetCourseByIdAsync(payment.CourseId);
        var paymentDto = MapToDetailsDto(payment, course);

        var verifyResult = new VerifyPaymentResultDto
        {
            Valid = issues.Count == 0,
            Issues = issues,
            Payment = paymentDto,
            VnPay = vnpayResult
        };

        return ApiResponse<VerifyPaymentResultDto>.SuccessResponse(verifyResult);
    }

    public async Task<ApiResponse<VnPayQueryResultDto>> RetrieveVnPayInformationAsync(int currentUserId, int paymentId, string ipAddress)
    {
        var payment = await _context.Payments.FirstOrDefaultAsync(p => p.PaymentId == paymentId);
        if (payment == null)
        {
            return ApiResponse<VnPayQueryResultDto>.FailureResponse("Payment not found.");
        }

        var result = await _vnPayService.QueryTransactionAsync(payment, ipAddress);
        return ApiResponse<VnPayQueryResultDto>.SuccessResponse(result);
    }

    private static PaymentDetailsDto MapToDetailsDto(Payment payment, CoursePaymentDto? course)
    {
        var latestTxn = payment.Transactions.OrderByDescending(t => t.TransactionId).FirstOrDefault();

        return new PaymentDetailsDto
        {
            PaymentId = payment.PaymentId,
            LearnerId = payment.LearnerId,
            LearnerName = payment.Learner?.FullName ?? string.Empty,
            LearnerEmail = payment.Learner?.Email ?? string.Empty,
            CourseId = payment.CourseId,
            CourseTitle = course?.Title ?? $"Course #{payment.CourseId}",
            CourseThumbnailUrl = course?.ThumbnailUrl ?? string.Empty,
            CourseDescription = course?.Description ?? string.Empty,
            EnrollmentId = payment.EnrollmentId,
            EnrollmentStatus = payment.Enrollment?.Status ?? string.Empty,
            Amount = payment.Amount,
            Currency = payment.Currency,
            PaymentMethod = payment.PaymentMethod,
            PaymentStatus = payment.Status,
            MerchantTxnRef = payment.MerchantTxnRef,
            VnPayTransactionNo = payment.VnPayTransactionNo,
            VnPayResponseCode = payment.VnPayResponseCode,
            VnPayTransactionStatus = payment.VnPayTransactionStatus,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt,
            LatestTransaction = latestTxn == null ? null : new PaymentTransactionDto
            {
                TransactionId = latestTxn.TransactionId,
                Provider = latestTxn.Provider,
                ProviderTransactionNo = latestTxn.ProviderTransactionNo,
                ResponseCode = latestTxn.ResponseCode,
                TransactionStatus = latestTxn.TransactionStatus,
                BankCode = latestTxn.BankCode,
                Amount = latestTxn.Amount,
                Status = latestTxn.Status,
                SignatureValid = latestTxn.SignatureValid,
                ProcessedAt = latestTxn.ProcessedAt
            }
        };
    }
}