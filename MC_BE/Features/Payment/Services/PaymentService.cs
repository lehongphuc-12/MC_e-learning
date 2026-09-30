using System.Security.Cryptography;
using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using PayOS.Models.Webhooks;

namespace MC_BE.Shared.Services;

public class PaymentService : IPaymentService
{
    private readonly SmartMcDbContext _context;
    private readonly IPayOsService _payOsService;
    private readonly ICourseCatalogService _courseCatalog;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(SmartMcDbContext context, IPayOsService payOsService, ICourseCatalogService courseCatalog, ILogger<PaymentService> logger)
    {
        _context = context;
        _payOsService = payOsService;
        _courseCatalog = courseCatalog;
        _logger = logger;
    }

    // ============================================================
    // SINGLE COURSE PAYMENT
    // ============================================================

    public async Task<ApiResponse<CreatePaymentResponseDto>> CreatePaymentAsync(int currentUserId, CreatePaymentRequest request, string ipAddress)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.Learner)
            .FirstOrDefaultAsync(e => e.EnrollmentId == request.EnrollmentId);

        if (enrollment == null)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Không tìm thấy thông tin ghi danh.");

        if (enrollment.LearnerId != currentUserId)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Bạn không có quyền thanh toán cho ghi danh này.");

        if (!string.Equals(enrollment.Status, "PENDING_PAYMENT", StringComparison.OrdinalIgnoreCase))
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                string.Equals(enrollment.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase)
                    ? "Khóa học đã được kích hoạt."
                    : $"Không thể thanh toán ghi danh ở trạng thái {enrollment.Status}.");

        var course = await _courseCatalog.GetCourseByIdAsync(enrollment.CourseId);

        if (course == null)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Không tìm thấy khóa học.");

        if (!string.Equals(course.Status, "PUBLISHED", StringComparison.OrdinalIgnoreCase))
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Khóa học hiện không mở thanh toán.");

        if (course.Price <= 0)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Giá khóa học không hợp lệ.");

        if (course.Price != decimal.Truncate(course.Price))
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Số tiền VND phải là số nguyên.");

        var alreadyPaid = await _context.PaymentItems
            .Include(i => i.Payment)
            .AnyAsync(i => i.EnrollmentId == enrollment.EnrollmentId && i.Payment.Status == "SUCCESS");

        if (alreadyPaid)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Ghi danh này đã được thanh toán.");

        var now = DateTime.UtcNow;
        var orderCode = await GenerateUniqueOrderCodeAsync();

        var payment = new Payment
        {
            LearnerId = currentUserId,
            Amount = course.Price,
            Currency = "VND",
            PaymentMethod = "PAYOS",
            Status = "PENDING",
            MerchantTxnRef = orderCode.ToString(),
            OrderInfo = $"Thanh toan khoa hoc {course.Title}",
            CreatedAt = now,
            UpdatedAt = now,
            ExpiresAt = now.AddMinutes(15)
        };

        payment.Items.Add(new PaymentItem
        {
            EnrollmentId = enrollment.EnrollmentId,
            CourseId = enrollment.CourseId,
            Amount = course.Price,
            CreatedAt = now
        });

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        return await CreatePayOsLinkAsync(payment, enrollment.EnrollmentId);
    }

    // ============================================================
    // CART PAYMENT
    // 1 Payment -> nhiều PaymentItem -> nhiều Enrollment/Course
    // ============================================================

    public async Task<ApiResponse<CreatePaymentResponseDto>> CreateCartPaymentAsync(int currentUserId, IReadOnlyCollection<int> enrollmentIds, string ipAddress)
    {
        if (enrollmentIds == null || enrollmentIds.Count == 0)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Giỏ hàng không có khóa học để thanh toán.");

        var ids = enrollmentIds.Where(id => id > 0).Distinct().ToList();

        if (ids.Count == 0)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Danh sách ghi danh không hợp lệ.");

        var enrollments = await _context.Enrollments
            .Where(e => ids.Contains(e.EnrollmentId))
            .ToListAsync();

        if (enrollments.Count != ids.Count)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Một hoặc nhiều ghi danh không tồn tại.");

        if (enrollments.Any(e => e.LearnerId != currentUserId))
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Bạn không có quyền thanh toán một hoặc nhiều ghi danh trong giỏ hàng.");

        var activeEnrollment = enrollments.FirstOrDefault(e =>
            string.Equals(e.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase));

        if (activeEnrollment != null)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse($"Khóa học #{activeEnrollment.CourseId} đã được kích hoạt.");

        var invalidEnrollment = enrollments.FirstOrDefault(e =>
            !string.Equals(e.Status, "PENDING_PAYMENT", StringComparison.OrdinalIgnoreCase));

        if (invalidEnrollment != null)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                $"Không thể thanh toán ghi danh #{invalidEnrollment.EnrollmentId} ở trạng thái {invalidEnrollment.Status}.");

        var courseData = new List<(Enrollment Enrollment, CoursePaymentDto Course)>();

        foreach (var enrollment in enrollments)
        {
            var course = await _courseCatalog.GetCourseByIdAsync(enrollment.CourseId);

            if (course == null)
                return ApiResponse<CreatePaymentResponseDto>.FailureResponse($"Không tìm thấy khóa học #{enrollment.CourseId}.");

            if (!string.Equals(course.Status, "PUBLISHED", StringComparison.OrdinalIgnoreCase))
                return ApiResponse<CreatePaymentResponseDto>.FailureResponse($"Khóa học \"{course.Title}\" hiện không mở thanh toán.");

            if (course.Price <= 0)
                return ApiResponse<CreatePaymentResponseDto>.FailureResponse($"Giá khóa học \"{course.Title}\" không hợp lệ.");

            if (course.Price != decimal.Truncate(course.Price))
                return ApiResponse<CreatePaymentResponseDto>.FailureResponse($"Giá khóa học \"{course.Title}\" phải là số nguyên VND.");

            courseData.Add((enrollment, course));
        }

        var alreadyPaid = await _context.PaymentItems
            .Include(i => i.Payment)
            .AnyAsync(i => ids.Contains(i.EnrollmentId) && i.Payment.Status == "SUCCESS");

        if (alreadyPaid)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Một hoặc nhiều khóa học trong giỏ đã được thanh toán.");

        var totalAmount = courseData.Sum(x => x.Course.Price);

        if (totalAmount <= 0)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Tổng số tiền thanh toán không hợp lệ.");

        if (totalAmount != decimal.Truncate(totalAmount))
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Tổng số tiền VND phải là số nguyên.");

        if (totalAmount > int.MaxValue)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse("Tổng số tiền vượt quá giới hạn thanh toán.");

        var now = DateTime.UtcNow;
        var orderCode = await GenerateUniqueOrderCodeAsync();

        await using var dbTransaction = await _context.Database.BeginTransactionAsync();

        Payment payment;

        try
        {
            payment = new Payment
            {
                LearnerId = currentUserId,
                Amount = totalAmount,
                Currency = "VND",
                PaymentMethod = "PAYOS",
                Status = "PENDING",
                MerchantTxnRef = orderCode.ToString(),
                OrderInfo = $"Thanh toan {courseData.Count} khoa hoc",
                CreatedAt = now,
                UpdatedAt = now,
                ExpiresAt = now.AddMinutes(15)
            };

            foreach (var entry in courseData)
            {
                payment.Items.Add(new PaymentItem
                {
                    EnrollmentId = entry.Enrollment.EnrollmentId,
                    CourseId = entry.Enrollment.CourseId,
                    Amount = entry.Course.Price,
                    CreatedAt = now
                });
            }

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }

        return await CreatePayOsLinkAsync(payment, enrollments[0].EnrollmentId);
    }

    // ============================================================
    // PAYOS WEBHOOK
    // ============================================================

    public async Task<bool> ProcessPayOsWebhookAsync(Webhook webhook)
    {
        WebhookData data;

        try
        {
            data = await _payOsService.VerifyWebhookAsync(webhook);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Webhook payOS có signature không hợp lệ.");
            return false;
        }

        var orderCode = data.OrderCode.ToString();

        var payment = await _context.Payments
            .Include(p => p.Items)
                .ThenInclude(i => i.Enrollment)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.MerchantTxnRef == orderCode);

        if (payment == null)
        {
            _logger.LogInformation(
                "Webhook payOS hợp lệ nhưng không tìm thấy payment tương ứng. Có thể đây là webhook validation của payOS. OrderCode={OrderCode}",
                orderCode);

            return true;
        }

        if (!string.Equals(payment.PaymentMethod, "PAYOS", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("PaymentId={PaymentId} không phải PAYOS.", payment.PaymentId);
            return false;
        }

        if (data.Amount != payment.Amount)
        {
            _logger.LogWarning(
                "Sai amount payOS. PaymentId={PaymentId}, DB={DbAmount}, PayOS={PayOsAmount}",
                payment.PaymentId,
                payment.Amount,
                data.Amount);

            return false;
        }

        if (!string.Equals(data.Code, "00", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "Webhook payOS không phải giao dịch thành công. OrderCode={OrderCode}, Code={Code}",
                orderCode,
                data.Code);

            return true;
        }

        if (string.Equals(payment.Status, "SUCCESS", StringComparison.OrdinalIgnoreCase))
            return true;

        var transactionExists = false;
        var providerReference = string.IsNullOrWhiteSpace(data.Reference)
            ? null
            : data.Reference.Trim();

        if (!string.IsNullOrWhiteSpace(providerReference))
        {
            transactionExists = await _context.PaymentTransactions.AnyAsync(t =>
                t.Provider == "PAYOS" &&
                t.ProviderTransactionNo == providerReference);
        }

        await using var dbTransaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var now = DateTime.UtcNow;

            payment.Status = "SUCCESS";
            payment.PaymentMethod = "PAYOS";
            payment.UpdatedAt = now;

            if (!transactionExists && !string.IsNullOrWhiteSpace(providerReference))
            {
                _context.PaymentTransactions.Add(new PaymentTransaction
                {
                    PaymentId = payment.PaymentId,
                    Provider = "PAYOS",
                    ProviderTransactionNo = providerReference,
                    ResponseCode = data.Code,
                    TransactionStatus = "PAID",
                    BankCode = data.CounterAccountBankId,
                    Amount = data.Amount,
                    Status = "SUCCESS",
                    SignatureValid = true,
                    ProcessedAt = now,
                    CreatedAt = now
                });
            }

            foreach (var item in payment.Items)
            {
                if (item.Enrollment == null)
                    continue;

                item.Enrollment.Status = "ACTIVE";
                item.Enrollment.EnrolledAt ??= now;
                item.Enrollment.ExpiresAt ??= now.AddDays(90);
                item.Enrollment.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            _logger.LogInformation(
                "payOS SUCCESS PaymentId={PaymentId}, OrderCode={OrderCode}, Reference={Reference}, ItemCount={ItemCount}",
                payment.PaymentId,
                orderCode,
                providerReference,
                payment.Items.Count);

            return true;
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    // ============================================================
    // GET PAYMENT
    // ============================================================

    public async Task<ApiResponse<PaymentDetailsDto>> GetMyPaymentAsync(int currentUserId, int paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Items)
                .ThenInclude(i => i.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Không tìm thấy giao dịch.");

        if (payment.LearnerId != currentUserId)
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Bạn không có quyền xem giao dịch này.");

        var firstItem = payment.Items.OrderBy(i => i.PaymentItemId).FirstOrDefault();
        CoursePaymentDto? course = null;

        if (firstItem != null)
            course = await _courseCatalog.GetCourseByIdAsync(firstItem.CourseId);

        return ApiResponse<PaymentDetailsDto>.SuccessResponse(MapPayment(payment, firstItem, course));
    }

    // ============================================================
    // PAYMENT HISTORY
    // ============================================================

    public async Task<ApiResponse<PagedResult<PaymentDetailsDto>>> GetMyPaymentHistoryAsync(int currentUserId, PaymentFilterRequest filter)
    {
        var query = _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Items)
                .ThenInclude(i => i.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .Where(p => p.LearnerId == currentUserId);

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

    // ============================================================
    // CREATE PAYOS LINK
    // ============================================================

    private async Task<ApiResponse<CreatePaymentResponseDto>> CreatePayOsLinkAsync(Payment payment, int responseEnrollmentId)
    {
        try
        {
            var result = await _payOsService.CreatePaymentLinkAsync(payment);

            if (string.IsNullOrWhiteSpace(result.CheckoutUrl))
            {
                payment.Status = "FAILED";
                payment.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return ApiResponse<CreatePaymentResponseDto>.FailureResponse("payOS không trả về checkout URL.");
            }

            return ApiResponse<CreatePaymentResponseDto>.SuccessResponse(new CreatePaymentResponseDto
            {
                PaymentId = payment.PaymentId,
                EnrollmentId = responseEnrollmentId,
                Amount = payment.Amount,
                Currency = payment.Currency,
                Status = payment.Status,
                PaymentUrl = result.CheckoutUrl,
                ExpiresAt = payment.ExpiresAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Create payOS payment failed. PaymentId={PaymentId}, OrderCode={OrderCode}",
                payment.PaymentId,
                payment.MerchantTxnRef);

            payment.Status = "FAILED";
            payment.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                $"Không thể tạo thanh toán payOS: {ex.Message}");
        }
    }

    // ============================================================
    // ORDER CODE
    // ============================================================

    private async Task<long> GenerateUniqueOrderCodeAsync()
    {
        var orderCode = GenerateOrderCode();

        while (await _context.Payments.AnyAsync(p => p.MerchantTxnRef == orderCode.ToString()))
            orderCode = GenerateOrderCode();

        return orderCode;
    }

    private static long GenerateOrderCode()
    {
        var prefix = DateTime.UtcNow.ToString("yyMMddHHmmss");
        var random = RandomNumberGenerator.GetInt32(100, 1000);
        return long.Parse($"{prefix}{random}");
    }

    // ============================================================
    // SYNC PAYMENT FROM PAYOS
    // ============================================================

    public async Task<ApiResponse<PaymentDetailsDto>> SyncMyPaymentAsync(int currentUserId, int paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Items)
                .ThenInclude(i => i.Enrollment)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId);

        if (payment == null)
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Không tìm thấy giao dịch.");

        if (payment.LearnerId != currentUserId)
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Bạn không có quyền kiểm tra giao dịch này.");

        if (!string.Equals(payment.PaymentMethod, "PAYOS", StringComparison.OrdinalIgnoreCase))
            return ApiResponse<PaymentDetailsDto>.FailureResponse("Giao dịch này không sử dụng payOS.");

        if (!string.Equals(payment.Status, "SUCCESS", StringComparison.OrdinalIgnoreCase))
        {
            if (!long.TryParse(payment.MerchantTxnRef, out var orderCode))
                return ApiResponse<PaymentDetailsDto>.FailureResponse("Mã đơn hàng payOS không hợp lệ.");

            var payOsResult = await _payOsService.GetPaymentInformationAsync(orderCode);

            if (!payOsResult.RequestSucceeded)
                return ApiResponse<PaymentDetailsDto>.FailureResponse(
                    payOsResult.Message ?? "Không thể kiểm tra trạng thái thanh toán từ payOS.");

            var isPaid = string.Equals(payOsResult.Status, "PAID", StringComparison.OrdinalIgnoreCase);

            if (isPaid)
            {
                if (payOsResult.Amount != payment.Amount)
                    return ApiResponse<PaymentDetailsDto>.FailureResponse("Số tiền trên payOS không khớp với giao dịch.");

                await using var dbTransaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    var now = DateTime.UtcNow;

                    payment.Status = "SUCCESS";
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

                    var providerReference = string.IsNullOrWhiteSpace(payOsResult.Reference)
                        ? null
                        : payOsResult.Reference.Trim();

                    if (!string.IsNullOrWhiteSpace(providerReference))
                    {
                        var existingTransaction = await _context.PaymentTransactions
                            .FirstOrDefaultAsync(t =>
                                t.Provider == "PAYOS" &&
                                t.ProviderTransactionNo == providerReference);

                        if (existingTransaction == null)
                        {
                            _context.PaymentTransactions.Add(new PaymentTransaction
                            {
                                PaymentId = payment.PaymentId,
                                Provider = "PAYOS",
                                ProviderTransactionNo = providerReference,
                                ResponseCode = "00",
                                TransactionStatus = "PAID",
                                Amount = payment.Amount,
                                Status = "SUCCESS",
                                SignatureValid = false,
                                ProcessedAt = now,
                                CreatedAt = now
                            });
                        }
                        else if (existingTransaction.PaymentId != payment.PaymentId)
                        {
                            _logger.LogWarning(
                                "PayOS Reference={Reference} đã tồn tại ở PaymentId={ExistingPaymentId}, payment hiện tại={PaymentId}. Không tạo transaction trùng.",
                                providerReference,
                                existingTransaction.PaymentId,
                                payment.PaymentId);
                        }
                    }

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            }
        }

        var firstItem = payment.Items.OrderBy(i => i.PaymentItemId).FirstOrDefault();
        CoursePaymentDto? course = null;

        if (firstItem != null)
            course = await _courseCatalog.GetCourseByIdAsync(firstItem.CourseId);

        return ApiResponse<PaymentDetailsDto>.SuccessResponse(MapPayment(payment, firstItem, course));
    }

    // ============================================================
    // MAP PAYMENT
    // ============================================================

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