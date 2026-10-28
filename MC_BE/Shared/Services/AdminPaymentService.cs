using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Shared.Services;

public class AdminPaymentService : IAdminPaymentService
{
    private readonly SmartMcDbContext _context;
    private readonly IPayOsService _payOsService;
    private readonly ICourseCatalogService _courseCatalog;

    public AdminPaymentService(SmartMcDbContext context, IPayOsService payOsService, ICourseCatalogService courseCatalog)
    {
        _context = context;
        _payOsService = payOsService;
        _courseCatalog = courseCatalog;
    }

    public async Task<ApiResponse<PagedResult<PaymentDetailsDto>>> SearchPaymentsAsync(int currentUserId, PaymentFilterRequest filter)
    {
        var query = _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Items)
                .ThenInclude(i => i.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var status = filter.Status.Trim().ToUpper();
            query = query.Where(p => p.Status.ToUpper() == status);
        }

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim().ToLower();

            query = query.Where(p =>
                p.MerchantTxnRef.ToLower().Contains(keyword) ||
                p.Learner.FullName.ToLower().Contains(keyword) ||
                p.Learner.Email.ToLower().Contains(keyword) ||
                p.Transactions.Any(t =>
                    t.ProviderTransactionNo != null &&
                    t.ProviderTransactionNo.ToLower().Contains(keyword)));
        }

        if (filter.FromDate.HasValue)
        {
            var fromDate = filter.FromDate.Value.ToDateTime(TimeOnly.MinValue);
            query = query.Where(p => p.CreatedAt >= fromDate);
        }

        if (filter.ToDate.HasValue)
        {
            var toDateExclusive = filter.ToDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            query = query.Where(p => p.CreatedAt < toDateExclusive);
        }

        if (filter.MinAmount.HasValue)
            query = query.Where(p => p.Amount >= filter.MinAmount.Value);

        if (filter.MaxAmount.HasValue)
            query = query.Where(p => p.Amount <= filter.MaxAmount.Value);

        var totalItems = await query.CountAsync();
        var page = Math.Max(filter.Page, 1);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var payments = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<PaymentDetailsDto>();

        foreach (var payment in payments)
        {
            var firstItem = payment.Items.OrderBy(i => i.PaymentItemId).FirstOrDefault();
            CoursePaymentDto? course = null;

            if (firstItem != null)
                course = await _courseCatalog.GetCourseByIdAsync(firstItem.CourseId);

            items.Add(MapPayment(payment, firstItem, course));
        }

        return ApiResponse<PagedResult<PaymentDetailsDto>>.SuccessResponse(new PagedResult<PaymentDetailsDto>
        {
            Items = items,
            TotalItems = totalItems,
            TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize),
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<PaymentDetailsDto>> GetPaymentAsync(int currentUserId, int paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Items)
                .ThenInclude(i => i.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Payment not found.");

        var firstItem = payment.Items.OrderBy(i => i.PaymentItemId).FirstOrDefault();
        CoursePaymentDto? course = null;

        if (firstItem != null)
            course = await _courseCatalog.GetCourseByIdAsync(firstItem.CourseId);

        return ApiResponse<PaymentDetailsDto>.SuccessResponse(MapPayment(payment, firstItem, course));
    }

    public async Task<ApiResponse<VerifyPaymentResultDto>> VerifyPaymentAsync(int currentUserId, int paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Items)
                .ThenInclude(i => i.Enrollment)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
            return ApiResponse<VerifyPaymentResultDto>.FailureResponse("Payment not found.");

        if (!string.Equals(payment.PaymentMethod, "PAYOS", StringComparison.OrdinalIgnoreCase))
            return ApiResponse<VerifyPaymentResultDto>.FailureResponse("Payment này không sử dụng payOS.");

        if (!long.TryParse(payment.MerchantTxnRef, out var orderCode))
            return ApiResponse<VerifyPaymentResultDto>.FailureResponse("OrderCode payOS không hợp lệ.");

        var payOs = await _payOsService.GetPaymentInformationAsync(orderCode);

        if (!payOs.RequestSucceeded)
            return ApiResponse<VerifyPaymentResultDto>.FailureResponse($"Không truy vấn được payOS: {payOs.Message}");

        var issues = new List<string>();

        if (payOs.Amount != payment.Amount)
            issues.Add($"Sai số tiền: DB={payment.Amount}, payOS={payOs.Amount}");

        var payOsPaid = string.Equals(payOs.Status, "PAID", StringComparison.OrdinalIgnoreCase);
        var dbPaid = string.Equals(payment.Status, "SUCCESS", StringComparison.OrdinalIgnoreCase);

        if (payOsPaid != dbPaid)
            issues.Add($"Sai trạng thái: DB={payment.Status}, payOS={payOs.Status}");

        // Recovery nếu webhook bị miss nhưng payOS xác nhận PAID.
        if (payOsPaid && payOs.Amount == payment.Amount && !dbPaid)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var now = DateTime.UtcNow;

                payment.Status = "SUCCESS";
                payment.PaymentMethod = "PAYOS";
                payment.UpdatedAt = now;

                foreach (var item in payment.Items)
                {
                    if (item.Enrollment == null)
                        continue;

                    item.Enrollment.Status = "ACTIVE";
                    item.Enrollment.EnrolledAt ??= now;
                    item.Enrollment.ExpiresAt ??= now.AddDays(90);
                    item.Enrollment.UpdatedAt = now;
                }

                var exists = !string.IsNullOrWhiteSpace(payOs.Reference) &&
                    await _context.PaymentTransactions.AnyAsync(t =>
                        t.Provider == "PAYOS" &&
                        t.ProviderTransactionNo == payOs.Reference);

                if (!exists)
                {
                    _context.PaymentTransactions.Add(new PaymentTransaction
                    {
                        PaymentId = payment.PaymentId,
                        Provider = "PAYOS",
                        ProviderTransactionNo = payOs.Reference,
                        ResponseCode = "00",
                        TransactionStatus = "PAID",
                        Amount = payment.Amount,
                        Status = "SUCCESS",
                        SignatureValid = false,
                        ProcessedAt = now,
                        CreatedAt = now
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                issues.RemoveAll(x => x.StartsWith("Sai trạng thái:", StringComparison.OrdinalIgnoreCase));
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        var firstItem = payment.Items.OrderBy(i => i.PaymentItemId).FirstOrDefault();
        CoursePaymentDto? course = null;

        if (firstItem != null)
            course = await _courseCatalog.GetCourseByIdAsync(firstItem.CourseId);

        var dto = MapPayment(payment, firstItem, course);
        var valid = payOs.Amount == payment.Amount;

        return ApiResponse<VerifyPaymentResultDto>.SuccessResponse(new VerifyPaymentResultDto
        {
            Valid = valid,
            IsSuccess = payOsPaid && valid,
            Message = payOsPaid && valid
                ? "payOS xác nhận giao dịch đã thanh toán."
                : $"Trạng thái payOS: {payOs.Status}.",
            TransactionStatus = payOs.Status,
            Issues = issues,
            Payment = dto,
            PayOs = payOs
        });
    }

    public async Task<ApiResponse<PayOsQueryResultDto>> RetrievePayOsInformationAsync(int currentUserId, int paymentId)
    {
        var payment = await _context.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
            return ApiResponse<PayOsQueryResultDto>.FailureResponse("Payment not found.");

        if (!string.Equals(payment.PaymentMethod, "PAYOS", StringComparison.OrdinalIgnoreCase))
            return ApiResponse<PayOsQueryResultDto>.FailureResponse("Payment này không sử dụng payOS.");

        if (!long.TryParse(payment.MerchantTxnRef, out var orderCode))
            return ApiResponse<PayOsQueryResultDto>.FailureResponse("OrderCode không hợp lệ.");

        var result = await _payOsService.GetPaymentInformationAsync(orderCode);

        if (!result.RequestSucceeded)
            return ApiResponse<PayOsQueryResultDto>.FailureResponse(
                result.Message ?? "Không truy vấn được payOS.");

        return ApiResponse<PayOsQueryResultDto>.SuccessResponse(result);
    }

    private static PaymentDetailsDto MapPayment(Payment payment, PaymentItem? firstItem, CoursePaymentDto? course)
    {
        var transaction = payment.Transactions
            .OrderByDescending(t => t.TransactionId)
            .FirstOrDefault();

        return new PaymentDetailsDto
        {
            PaymentId = payment.PaymentId,
            LearnerId = payment.LearnerId,
            LearnerName = payment.Learner?.FullName ?? string.Empty,
            LearnerEmail = payment.Learner?.Email ?? string.Empty,

            // Giữ item đầu tiên để không phá Admin UI cũ.
            CourseId = firstItem?.CourseId ?? 0,
            CourseTitle = course?.Title ?? (firstItem == null ? string.Empty : $"Course #{firstItem.CourseId}"),
            CourseThumbnailUrl = course?.ThumbnailUrl ?? string.Empty,
            CourseDescription = course?.Description ?? string.Empty,
            EnrollmentId = firstItem?.EnrollmentId ?? 0,
            EnrollmentStatus = firstItem?.Enrollment?.Status ?? string.Empty,

            Amount = payment.Amount,
            Currency = payment.Currency,
            PaymentMethod = payment.PaymentMethod,
            PaymentStatus = payment.Status,
            MerchantTxnRef = payment.MerchantTxnRef,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt,

            LatestTransaction = transaction == null ? null : new PaymentTransactionDto
            {
                TransactionId = transaction.TransactionId,
                Provider = transaction.Provider,
                ProviderTransactionNo = transaction.ProviderTransactionNo,
                ResponseCode = transaction.ResponseCode,
                TransactionStatus = transaction.TransactionStatus,
                BankCode = transaction.BankCode,
                Amount = transaction.Amount,
                Status = transaction.Status,
                SignatureValid = transaction.SignatureValid,
                ProcessedAt = transaction.ProcessedAt ?? transaction.CreatedAt
            }
        };
    }
}