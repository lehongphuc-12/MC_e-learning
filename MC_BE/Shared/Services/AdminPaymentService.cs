using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Shared.Services;

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

    // ============================================================
    // AD07 - SEARCH PAYMENTS
    // ============================================================

    public async Task<
        ApiResponse<PagedResult<PaymentDetailsDto>>
    > SearchPaymentsAsync(
        int currentUserId,
        PaymentFilterRequest filter)
    {
        var query = _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Course)
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .AsQueryable();

        // STATUS
        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var status =
                filter.Status.Trim().ToUpper();

            query = query.Where(
                p =>
                    p.Status != null &&
                    p.Status.ToUpper() == status
            );
        }

        // KEYWORD
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword =
                filter.Keyword.Trim().ToLower();

            query = query.Where(
                p =>
                    (
                        p.MerchantTxnRef != null &&
                        p.MerchantTxnRef
                            .ToLower()
                            .Contains(keyword)
                    )
                    ||
                    (
                        p.VnPayTransactionNo != null &&
                        p.VnPayTransactionNo
                            .ToLower()
                            .Contains(keyword)
                    )
                    ||
                    (
                        p.Learner != null &&
                        p.Learner.FullName != null &&
                        p.Learner.FullName
                            .ToLower()
                            .Contains(keyword)
                    )
                    ||
                    (
                        p.Learner != null &&
                        p.Learner.Email != null &&
                        p.Learner.Email
                            .ToLower()
                            .Contains(keyword)
                    )
                    ||
                    (
                        p.Course != null &&
                        p.Course.Title != null &&
                        p.Course.Title
                            .ToLower()
                            .Contains(keyword)
                    )
            );
        }

        // FROM DATE
        if (filter.FromDate.HasValue)
        {
            var fromUtc =
                DateTime.SpecifyKind(
                    filter.FromDate.Value.Date,
                    DateTimeKind.Utc
                );

            query = query.Where(
                p => p.CreatedAt >= fromUtc
            );
        }

        // TO DATE
        if (filter.ToDate.HasValue)
        {
            var toUtc =
                DateTime.SpecifyKind(
                    filter.ToDate.Value.Date
                        .AddDays(1)
                        .AddTicks(-1),
                    DateTimeKind.Utc
                );

            query = query.Where(
                p => p.CreatedAt <= toUtc
            );
        }

        // MIN AMOUNT
        if (filter.MinAmount.HasValue)
        {
            query = query.Where(
                p => p.Amount >= filter.MinAmount.Value
            );
        }

        // MAX AMOUNT
        if (filter.MaxAmount.HasValue)
        {
            query = query.Where(
                p => p.Amount <= filter.MaxAmount.Value
            );
        }

        // COUNT
        var totalItems =
            await query.CountAsync();

        // PAGINATION
        var page =
            Math.Max(1, filter.Page);

        var pageSize =
            Math.Clamp(
                filter.PageSize,
                1,
                100
            );

        var payments =
            await query
                .OrderByDescending(
                    p => p.CreatedAt
                )
                .Skip(
                    (page - 1) * pageSize
                )
                .Take(pageSize)
                .ToListAsync();

        var items =
            new List<PaymentDetailsDto>();

        foreach (var payment in payments)
        {
            var course =
                await _courseCatalog.GetCourseByIdAsync(
                    payment.CourseId
                );

            items.Add(
                MapToDetailsDto(
                    payment,
                    course
                )
            );
        }

        var result =
            new PagedResult<PaymentDetailsDto>
            {
                Items = items,

                TotalCount = totalItems,

                TotalItems = totalItems,

                TotalPages =
                    totalItems == 0
                        ? 0
                        : (int)Math.Ceiling(
                            (double)totalItems /
                            pageSize
                        ),

                Page = page,

                PageSize = pageSize
            };

        return
            ApiResponse<
                PagedResult<PaymentDetailsDto>
            >.SuccessResponse(result);
    }

    // ============================================================
    // AD07 - GET PAYMENT DETAIL
    // ============================================================

    public async Task<
        ApiResponse<PaymentDetailsDto>
    > GetPaymentAsync(
        int currentUserId,
        int paymentId)
    {
        var payment =
            await _context.Payments
                .Include(p => p.Learner)
                .Include(p => p.Enrollment)
                .Include(p => p.Transactions)
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    p => p.PaymentId == paymentId
                );

        if (payment == null)
        {
            return
                ApiResponse<
                    PaymentDetailsDto
                >.FailureResponse(
                    "Payment not found."
                );
        }

        var course =
            await _courseCatalog.GetCourseByIdAsync(
                payment.CourseId
            );

        return
            ApiResponse<
                PaymentDetailsDto
            >.SuccessResponse(
                MapToDetailsDto(
                    payment,
                    course
                )
            );
    }

    // ============================================================
    // AD06 - VERIFY WITH VNPAY
    // ============================================================

    public async Task<
        ApiResponse<VerifyPaymentResultDto>
    > VerifyPaymentAsync(
        int currentUserId,
        int paymentId,
        string ipAddress)
    {
        var payment =
            await _context.Payments
                .Include(p => p.Learner)
                .Include(p => p.Enrollment)
                .Include(p => p.Transactions)
                .FirstOrDefaultAsync(
                    p => p.PaymentId == paymentId
                );

        if (payment == null)
        {
            return
                ApiResponse<
                    VerifyPaymentResultDto
                >.FailureResponse(
                    "Payment not found."
                );
        }

        var issues =
            new List<string>();

        VnPayQueryResultDto? vnPayResult = null;

        bool vnPaySuccess = false;

        try
        {
            vnPayResult =
                await _vnPayService.QueryTransactionAsync(
                    payment,
                    ipAddress
                );

            if (!vnPayResult.RequestSucceeded)
            {
                issues.Add(
                    "VNPay query thất bại: " +
                    (
                        vnPayResult.Message ??
                        vnPayResult.ResponseCode ??
                        "Unknown error"
                    )
                );
            }
            else
            {
                // ------------------------------------------------
                // CHECK AMOUNT
                // ------------------------------------------------

                if (vnPayResult.Amount.HasValue)
                {
                    if (
                        vnPayResult.Amount.Value !=
                        payment.Amount
                    )
                    {
                        issues.Add(
                            $"Sai lệch số tiền. " +
                            $"System: {payment.Amount}, " +
                            $"VNPay: {vnPayResult.Amount.Value}"
                        );
                    }
                }

                // ------------------------------------------------
                // CHECK VNPAY STATUS
                // ------------------------------------------------

                vnPaySuccess =
                    vnPayResult.ResponseCode == "00" &&
                    vnPayResult.TransactionStatus == "00";

                // ------------------------------------------------
                // CHECK SYSTEM STATUS
                // ------------------------------------------------

                var systemSuccess =
                    string.Equals(
                        payment.Status,
                        "SUCCESS",
                        StringComparison.OrdinalIgnoreCase
                    );

                if (vnPaySuccess != systemSuccess)
                {
                    issues.Add(
                        $"Sai lệch trạng thái. " +
                        $"System: {payment.Status}, " +
                        $"VNPay: {vnPayResult.TransactionStatus}"
                    );
                }

                // ------------------------------------------------
                // CHECK TRANSACTION NUMBER
                // ------------------------------------------------

                if (
                    !string.IsNullOrWhiteSpace(
                        vnPayResult.TransactionNo
                    )
                    &&
                    !string.IsNullOrWhiteSpace(
                        payment.VnPayTransactionNo
                    )
                    &&
                    payment.VnPayTransactionNo !=
                    vnPayResult.TransactionNo
                )
                {
                    issues.Add(
                        $"Sai lệch mã giao dịch VNPay. " +
                        $"System: {payment.VnPayTransactionNo}, " +
                        $"VNPay: {vnPayResult.TransactionNo}"
                    );
                }

                // ------------------------------------------------
                // AUTHORITATIVE VNPAY SUCCESS
                // ------------------------------------------------

                var amountValid =
                    !vnPayResult.Amount.HasValue ||
                    vnPayResult.Amount.Value == payment.Amount;

                if (
                    vnPaySuccess &&
                    amountValid
                )
                {
                    payment.Status = "SUCCESS";

                    payment.VnPayResponseCode =
                        vnPayResult.ResponseCode;

                    payment.VnPayTransactionStatus =
                        vnPayResult.TransactionStatus;

                    payment.VnPayTransactionNo =
                        vnPayResult.TransactionNo;

                    payment.UpdatedAt =
                        DateTime.UtcNow;

                    // ACTIVE ENROLLMENT
                    if (
                        payment.Enrollment != null
                    )
                    {
                        payment.Enrollment.Status =
                            "ACTIVE";

                        payment.Enrollment.EnrolledAt =
                            payment.Enrollment.EnrolledAt
                            ?? DateTime.UtcNow;

                        payment.Enrollment.ExpiresAt =
                            payment.Enrollment.ExpiresAt
                            ?? DateTime.UtcNow.AddDays(90);

                        payment.Enrollment.UpdatedAt =
                            DateTime.UtcNow;
                    }

                    // ------------------------------------------------
                    // CREATE TRANSACTION HISTORY
                    // ------------------------------------------------

                    var transactionExists =
                        !string.IsNullOrWhiteSpace(
                            vnPayResult.TransactionNo
                        )
                        &&
                        await _context.PaymentTransactions
                            .AnyAsync(
                                t =>
                                    t.PaymentId ==
                                    payment.PaymentId
                                    &&
                                    t.ProviderTransactionNo ==
                                    vnPayResult.TransactionNo
                            );

                    if (!transactionExists)
                    {
                        var transaction =
                            new PaymentTransaction
                            {
                                PaymentId =
                                    payment.PaymentId,

                                Provider =
                                    "VNPAY",

                                ProviderTransactionNo =
                                    vnPayResult.TransactionNo,

                                ResponseCode =
                                    vnPayResult.ResponseCode,

                                TransactionStatus =
                                    vnPayResult.TransactionStatus,

                                BankCode =
                                    vnPayResult.BankCode,

                                Amount =
                                    payment.Amount,

                                Status =
                                    "SUCCESS",

                                SignatureValid =
                                    true,

                                ProcessedAt =
                                    DateTime.UtcNow,

                                CreatedAt =
                                    DateTime.UtcNow
                            };

                        _context.PaymentTransactions
                            .Add(transaction);
                    }

                    await _context.SaveChangesAsync();
                }
            }
        }
        catch (Exception ex)
        {
            issues.Add(
                $"Không thể kết nối VNPay: {ex.Message}"
            );
        }

        var course =
            await _courseCatalog.GetCourseByIdAsync(
                payment.CourseId
            );

        var paymentDto =
            MapToDetailsDto(
                payment,
                course
            );

        var verifyResult =
            new VerifyPaymentResultDto
            {
                Valid =
                    issues.Count == 0,

                IsSuccess =
                    vnPaySuccess,

                Message =
                    issues.Count == 0
                        ? (
                            vnPaySuccess
                                ? "Giao dịch VNPay thành công và dữ liệu khớp."
                                : "Giao dịch VNPay chưa thành công."
                        )
                        : "Phát hiện sai lệch dữ liệu giao dịch.",

                TransactionStatus =
                    vnPayResult?.TransactionStatus
                    ?? payment.Status,

                Issues = issues,

                Payment = paymentDto,

                VnPay = vnPayResult
            };

        return
            ApiResponse<
                VerifyPaymentResultDto
            >.SuccessResponse(
                verifyResult
            );
    }

    // ============================================================
    // GET VNPAY INFORMATION
    // ============================================================

    public async Task<
        ApiResponse<VnPayQueryResultDto>
    > RetrieveVnPayInformationAsync(
        int currentUserId,
        int paymentId,
        string ipAddress)
    {
        var payment =
            await _context.Payments
                .FirstOrDefaultAsync(
                    p => p.PaymentId == paymentId
                );

        if (payment == null)
        {
            return
                ApiResponse<
                    VnPayQueryResultDto
                >.FailureResponse(
                    "Payment not found."
                );
        }

        var result =
            await _vnPayService.QueryTransactionAsync(
                payment,
                ipAddress
            );

        return
            ApiResponse<
                VnPayQueryResultDto
            >.SuccessResponse(
                result
            );
    }

    // ============================================================
    // MAP DTO
    // ============================================================

    private static PaymentDetailsDto MapToDetailsDto(
        Payment payment,
        CoursePaymentDto? course)
    {
        var latestTxn =
            payment.Transactions
                .OrderByDescending(
                    t => t.TransactionId
                )
                .FirstOrDefault();

        return new PaymentDetailsDto
        {
            PaymentId =
                payment.PaymentId,

            LearnerId =
                payment.LearnerId,

            LearnerName =
                payment.Learner?.FullName ??
                string.Empty,

            LearnerEmail =
                payment.Learner?.Email ??
                string.Empty,

            CourseId =
                payment.CourseId,

            CourseTitle =
                course?.Title ??
                $"Course #{payment.CourseId}",

            CourseThumbnailUrl =
                course?.ThumbnailUrl ??
                string.Empty,

            CourseDescription =
                course?.Description ??
                string.Empty,

            EnrollmentId =
                payment.EnrollmentId,

            EnrollmentStatus =
                payment.Enrollment?.Status ??
                string.Empty,

            Amount =
                payment.Amount,

            Currency =
                payment.Currency,

            PaymentMethod =
                payment.PaymentMethod,

            PaymentStatus =
                payment.Status,

            MerchantTxnRef =
                payment.MerchantTxnRef,

            VnPayTransactionNo =
                payment.VnPayTransactionNo,

            VnPayResponseCode =
                payment.VnPayResponseCode,

            VnPayTransactionStatus =
                payment.VnPayTransactionStatus,

            CreatedAt =
                payment.CreatedAt,

            UpdatedAt =
                payment.UpdatedAt,

            LatestTransaction =
                latestTxn == null
                    ? null
                    : new PaymentTransactionDto
                    {
                        TransactionId =
                            latestTxn.TransactionId,

                        Provider =
                            latestTxn.Provider,

                        ProviderTransactionNo =
                            latestTxn.ProviderTransactionNo,

                        ResponseCode =
                            latestTxn.ResponseCode,

                        TransactionStatus =
                            latestTxn.TransactionStatus,

                        BankCode =
                            latestTxn.BankCode,

                        Amount =
                            latestTxn.Amount,

                        Status =
                            latestTxn.Status,

                        SignatureValid =
                            latestTxn.SignatureValid,

                        ProcessedAt =
                            latestTxn.ProcessedAt
                            ?? DateTime.UtcNow
                    }
        };
    }
}