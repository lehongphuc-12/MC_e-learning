using System;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MC_BE.Shared.Services;

public class PaymentService : IPaymentService
{
    private readonly SmartMcDbContext _context;
    private readonly IVnPayService _vnPayService;
    private readonly ICourseCatalogService _courseCatalog;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        SmartMcDbContext context,
        IVnPayService vnPayService,
        ICourseCatalogService courseCatalog,
        ILogger<PaymentService> logger)
    {
        _context = context;
        _vnPayService = vnPayService;
        _courseCatalog = courseCatalog;
        _logger = logger;
    }

    public async Task<ApiResponse<CreatePaymentResponseDto>> CreatePaymentAsync(int currentUserId, CreatePaymentRequest request, string ipAddress)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.Learner)
            .FirstOrDefaultAsync(e => e.EnrollmentId == request.EnrollmentId);

        if (enrollment == null)
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Không tìm thấy thông tin ghi danh.");
        }

        if (enrollment.LearnerId != currentUserId)
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Bạn không có quyền thanh toán cho ghi danh này.");
        }

        if (enrollment.Status == "ACTIVE")
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Khóa học này đã được kích hoạt trước đó.");
        }

        var course = await _courseCatalog.GetCourseByIdAsync(enrollment.CourseId);
        if (course == null)
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Khóa học không tồn tại.");
        }

        // Tìm kiếm toàn bộ bản ghi thanh toán đã tồn tại của enrollment này (không phân biệt trạng thái để tránh trùng unique key)
        var existingPayment = await _context.Payments
            .FirstOrDefaultAsync(p => p.EnrollmentId == enrollment.EnrollmentId);

        Payment payment;
        var txnRef = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{enrollment.EnrollmentId}_{RandomNumberGenerator.GetInt32(1000, 9999)}";

        if (existingPayment != null)
        {
            if (existingPayment.Status == "SUCCESS")
            {
                return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Khóa học này đã được thanh toán thành công trước đó.");
            }

            // Tái sử dụng bản ghi cũ và cập nhật lại thông tin PENDING mới
            payment = existingPayment;
            payment.Amount = course.Price;
            payment.MerchantTxnRef = txnRef;
            payment.Status = "PENDING";
            payment.UpdatedAt = DateTime.UtcNow;
            payment.ExpiresAt = DateTime.UtcNow.AddMinutes(15);

            _context.Payments.Update(payment);
            await _context.SaveChangesAsync();
        }
        else
        {
            payment = new Payment
            {
                LearnerId = currentUserId,
                CourseId = enrollment.CourseId,
                EnrollmentId = enrollment.EnrollmentId,
                Amount = course.Price,
                Currency = "VND",
                PaymentMethod = "VNPAY",
                Status = "PENDING",
                MerchantTxnRef = txnRef,
                OrderInfo = $"Thanh toan khoa hoc {course.Title}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            enrollment.PaymentId = payment.PaymentId;
            await _context.SaveChangesAsync();
        }

        var paymentUrl = _vnPayService.CreatePaymentUrl(payment, ipAddress);

        return ApiResponse<CreatePaymentResponseDto>.SuccessResponse(new CreatePaymentResponseDto
        {
            PaymentId = payment.PaymentId,
            PaymentUrl = paymentUrl,
            ExpiresAt = payment.ExpiresAt
        });
    }

    public async Task<ApiResponse<PaymentDetailsDto>> ProcessVnPayResultAsync(IQueryCollection query)
    {
        var txnRef = query["vnp_TxnRef"].ToString();
        var responseCode = query["vnp_ResponseCode"].ToString();
        var transactionStatus = query["vnp_TransactionStatus"].ToString();
        var transactionNo = query["vnp_TransactionNo"].ToString();
        var bankCode = query["vnp_BankCode"].ToString();

        var payment = await _context.Payments
            .Include(p => p.Enrollment)
            .Include(p => p.Learner)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.MerchantTxnRef == txnRef);

        if (payment == null)
        {
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Giao dịch không tồn tại trong hệ thống.");
        }

        var isSignatureValid = _vnPayService.ValidateSignature(query);
        var isSuccess = isSignatureValid && responseCode == "00" && transactionStatus == "00";

        if (payment.Status != "SUCCESS")
        {
            payment.VnPayTransactionNo = transactionNo;
            payment.VnPayResponseCode = responseCode;
            payment.VnPayTransactionStatus = transactionStatus;
            payment.UpdatedAt = DateTime.UtcNow;

            if (isSuccess)
            {
                payment.Status = "SUCCESS";
                if (payment.Enrollment != null)
                {
                    payment.Enrollment.Status = "ACTIVE";
                    payment.Enrollment.EnrolledAt = DateTime.UtcNow;
                    payment.Enrollment.ExpiresAt = DateTime.UtcNow.AddDays(90);
                    payment.Enrollment.UpdatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                payment.Status = "FAILED";
            }

            var transaction = new PaymentTransaction
            {
                PaymentId = payment.PaymentId,
                Provider = "VNPAY",
                ProviderTransactionNo = transactionNo,
                ResponseCode = responseCode,
                TransactionStatus = transactionStatus,
                BankCode = bankCode,
                Amount = payment.Amount,
                Status = isSuccess ? "SUCCESS" : "FAILED",
                SignatureValid = isSignatureValid,
                ProcessedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.PaymentTransactions.Add(transaction);
            await _context.SaveChangesAsync();
        }

        var course = await _courseCatalog.GetCourseByIdAsync(payment.CourseId);
        return ApiResponse<PaymentDetailsDto>.SuccessResponse(MapToDetailsDto(payment, course));
    }

    public async Task<ApiResponse<PaymentDetailsDto>> GetMyPaymentAsync(int currentUserId, int paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
        {
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Giao dịch không tồn tại.");
        }

        if (payment.LearnerId != currentUserId)
        {
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Bạn không có quyền xem thông tin giao dịch này.");
        }

        var course = await _courseCatalog.GetCourseByIdAsync(payment.CourseId);
        return ApiResponse<PaymentDetailsDto>.SuccessResponse(MapToDetailsDto(payment, course));
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
                ProcessedAt = latestTxn.ProcessedAt ?? DateTime.UtcNow
            }
        };
    }
}