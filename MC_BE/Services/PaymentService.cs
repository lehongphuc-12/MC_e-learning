using System;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Data;
using MC_BE.DTOs;
using MC_BE.Models.Entities;
using MC_BE.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Services;

public class PaymentService : IPaymentService
{
    private readonly SmartMcDbContext _context;
    private readonly IVnPayService _vnPayService;
    private readonly ICourseCatalogService _courseCatalog;

    public PaymentService(
        SmartMcDbContext context,
        IVnPayService vnPayService,
        ICourseCatalogService courseCatalog)
    {
        _context = context;
        _vnPayService = vnPayService;
        _courseCatalog = courseCatalog;
    }

    public async Task<ApiResponse<CreatePaymentResponseDto>> CreatePaymentAsync(
        int currentUserId,
        CreatePaymentRequest request,
        string ipAddress)
    {
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.EnrollmentId == request.EnrollmentId && e.LearnerId == currentUserId);

        if (enrollment == null)
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Enrollment not found.");
        }

        if (enrollment.Status == "ACTIVE")
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("This course is already activated.");
        }

        var course = await _courseCatalog.GetCourseByIdAsync(enrollment.CourseId);
        if (course == null)
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Course does not exist.");
        }

        if (course.Price <= 0)
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Course is free. No payment needed.");
        }

        var existingPayment = await _context.Payments
            .FirstOrDefaultAsync(p => p.EnrollmentId == enrollment.EnrollmentId && p.Status == "PENDING" && p.ExpiresAt > DateTime.UtcNow);

        Payment payment;
        if (existingPayment != null)
        {
            payment = existingPayment;
        }
        else
        {
            var now = DateTime.UtcNow;
            payment = new Payment
            {
                LearnerId = currentUserId,
                CourseId = course.CourseId,
                EnrollmentId = enrollment.EnrollmentId,
                Amount = course.Price,
                Currency = "VND",
                PaymentMethod = "VNPAY",
                Status = "PENDING",
                MerchantTxnRef = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}",
                OrderInfo = $"Payment for course {course.Title}",
                CreatedAt = now,
                UpdatedAt = now,
                ExpiresAt = now.AddMinutes(15)
            };

            await _context.Payments.AddAsync(payment);
            await _context.SaveChangesAsync();

            enrollment.PaymentId = payment.PaymentId;
            _context.Enrollments.Update(enrollment);
            await _context.SaveChangesAsync();
        }

        var paymentUrl = _vnPayService.CreatePaymentUrl(payment, ipAddress);

        return ApiResponse<CreatePaymentResponseDto>.SuccessResponse(new CreatePaymentResponseDto
        {
            PaymentId = payment.PaymentId,
            EnrollmentId = payment.EnrollmentId,
            Amount = payment.Amount,
            Currency = payment.Currency,
            Status = payment.Status,
            PaymentUrl = paymentUrl,
            ExpiresAt = payment.ExpiresAt
        }, "Payment URL generated successfully.");
    }

    public async Task<ApiResponse<PaymentDetailsDto>> GetMyPaymentAsync(int currentUserId, int paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId && p.LearnerId == currentUserId);

        if (payment == null)
        {
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Payment record not found.");
        }

        var course = await _courseCatalog.GetCourseByIdAsync(payment.CourseId);
        return ApiResponse<PaymentDetailsDto>.SuccessResponse(MapToDetailsDto(payment, course));
    }

    public async Task<ApiResponse<PaymentDetailsDto>> ProcessVnPayResultAsync(IQueryCollection query)
    {
        if (!_vnPayService.ValidateSignature(query))
        {
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Invalid VNPay signature.");
        }

        var txnRef = query["vnp_TxnRef"].ToString();
        var responseCode = query["vnp_ResponseCode"].ToString();
        var transactionStatus = query["vnp_TransactionStatus"].ToString();
        var vnpayTranNo = query["vnp_TransactionNo"].ToString();
        var bankCode = query["vnp_BankCode"].ToString();

        decimal.TryParse(query["vnp_Amount"], out var rawAmount);
        var amount = rawAmount / 100;

        var payment = await _context.Payments
            .Include(p => p.Enrollment)
            .Include(p => p.Learner)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.MerchantTxnRef == txnRef);

        if (payment == null)
        {
            return ApiResponse<PaymentDetailsDto>.FailureResponse($"Payment transaction {txnRef} not found.");
        }

        var isSuccess = responseCode == "00" && transactionStatus == "00";
        var transaction = new PaymentTransaction
        {
            PaymentId = payment.PaymentId,
            Provider = "VNPAY",
            ProviderTransactionNo = vnpayTranNo,
            ResponseCode = responseCode,
            TransactionStatus = transactionStatus,
            BankCode = bankCode,
            Amount = amount,
            Status = isSuccess ? "SUCCESS" : "FAILED",
            SignatureValid = true,
            ProcessedAt = DateTime.UtcNow,
            RawPayload = string.Join("&", query.Select(x => $"{x.Key}={x.Value}"))
        };

        await _context.PaymentTransactions.AddAsync(transaction);

        payment.VnPayTransactionNo = vnpayTranNo;
        payment.VnPayResponseCode = responseCode;
        payment.VnPayTransactionStatus = transactionStatus;
        payment.UpdatedAt = DateTime.UtcNow;

        if (isSuccess)
        {
            payment.Status = "SUCCESS";
            if (payment.Enrollment != null)
            {
                var now = DateTime.UtcNow;
                payment.Enrollment.Status = "ACTIVE";
                payment.Enrollment.EnrolledAt = now;
                // Kích hoạt hạn học đúng 3 tháng (90 ngày)
                payment.Enrollment.ExpiresAt = now.AddDays(90);
                payment.Enrollment.UpdatedAt = now;
                _context.Enrollments.Update(payment.Enrollment);
            }
        }
        else
        {
            payment.Status = "FAILED";
        }

        _context.Payments.Update(payment);
        await _context.SaveChangesAsync();

        var course = await _courseCatalog.GetCourseByIdAsync(payment.CourseId);
        return ApiResponse<PaymentDetailsDto>.SuccessResponse(
            MapToDetailsDto(payment, course),
            isSuccess ? "Payment completed successfully." : "Payment failed."
        );
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