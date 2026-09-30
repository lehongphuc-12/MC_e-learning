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


    public PaymentService(
        SmartMcDbContext context,
        IPayOsService payOsService,
        ICourseCatalogService courseCatalog,
        ILogger<PaymentService> logger)
    {
        _context = context;

        _payOsService = payOsService;

        _courseCatalog = courseCatalog;

        _logger = logger;
    }


    public async Task<ApiResponse<CreatePaymentResponseDto>> CreatePaymentAsync(
        int currentUserId,
        CreatePaymentRequest request,
        string ipAddress)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.Learner)
            .FirstOrDefaultAsync(e =>
                e.EnrollmentId == request.EnrollmentId);


        if (enrollment == null)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                "Không tìm thấy thông tin ghi danh.");


        if (enrollment.LearnerId != currentUserId)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                "Bạn không có quyền thanh toán cho ghi danh này.");


        if (!string.Equals(
    enrollment.Status,
    "PENDING_PAYMENT",
    StringComparison.OrdinalIgnoreCase))
{
    return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
        string.Equals(
            enrollment.Status,
            "ACTIVE",
            StringComparison.OrdinalIgnoreCase)
            ? "Khóa học đã được kích hoạt."
            : $"Không thể thanh toán ghi danh ở trạng thái {enrollment.Status}.");
}


        var course = await _courseCatalog.GetCourseByIdAsync(
            enrollment.CourseId);


        if (course == null)
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                "Không tìm thấy khóa học.");


if (!string.Equals(
    course.Status,
    "PUBLISHED",
    StringComparison.OrdinalIgnoreCase)){
    return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
        "Khóa học hiện không mở thanh toán.");
}
        if (course.Price <= 0){
    return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
        "Giá khóa học không hợp lệ.");
}


        if (course.Price != decimal.Truncate(course.Price))
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                "Số tiền VND phải là số nguyên.");


        var payment = await _context.Payments
            .FirstOrDefaultAsync(p =>
                p.EnrollmentId == enrollment.EnrollmentId);


        if (payment != null &&
            string.Equals(
                payment.Status,
                "SUCCESS",
                StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                "Ghi danh này đã được thanh toán.");
        }


        var orderCode = GenerateOrderCode();


        while (await _context.Payments.AnyAsync(
            p => p.MerchantTxnRef == orderCode.ToString()))
        {
            orderCode = GenerateOrderCode();
        }


        if (payment == null)
        {
            payment = new Payment
            {
                LearnerId = currentUserId,

                CourseId = enrollment.CourseId,

                EnrollmentId = enrollment.EnrollmentId,

                Amount = course.Price,

                Currency = "VND",

                PaymentMethod = "PAYOS",

                Status = "PENDING",

                MerchantTxnRef = orderCode.ToString(),

                OrderInfo = $"Thanh toan khoa hoc {course.Title}",

                CreatedAt = DateTime.UtcNow,

                UpdatedAt = DateTime.UtcNow,

                ExpiresAt = DateTime.UtcNow.AddMinutes(15)
            };


            _context.Payments.Add(payment);
        }
        else
        {
            payment.Amount = course.Price;

            payment.Currency = "VND";

            payment.PaymentMethod = "PAYOS";

            payment.Status = "PENDING";

            payment.MerchantTxnRef = orderCode.ToString();

            payment.OrderInfo =
                $"Thanh toan khoa hoc {course.Title}";

            payment.UpdatedAt = DateTime.UtcNow;

            payment.ExpiresAt = DateTime.UtcNow.AddMinutes(15);
        }


        await _context.SaveChangesAsync();


        if (enrollment.PaymentId != payment.PaymentId)
        {
            enrollment.PaymentId = payment.PaymentId;

            enrollment.UpdatedAt = DateTime.UtcNow;


            await _context.SaveChangesAsync();
        }


        try
        {
            var result =
                await _payOsService.CreatePaymentLinkAsync(payment);


            if (string.IsNullOrWhiteSpace(result.CheckoutUrl))
            {
                payment.Status = "FAILED";

                payment.UpdatedAt = DateTime.UtcNow;


                await _context.SaveChangesAsync();


                return ApiResponse<CreatePaymentResponseDto>.FailureResponse(
                    "payOS không trả về checkout URL.");
            }


            return ApiResponse<CreatePaymentResponseDto>.SuccessResponse(
                new CreatePaymentResponseDto
                {
                    PaymentId = payment.PaymentId,

                    EnrollmentId = payment.EnrollmentId,

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


    public async Task<bool> ProcessPayOsWebhookAsync(
        Webhook webhook)
    {
        WebhookData data;


        try
        {
            data = await _payOsService.VerifyWebhookAsync(webhook);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Webhook payOS có signature không hợp lệ.");


            return false;
        }


        var orderCode = data.OrderCode.ToString();


        var payment = await _context.Payments
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p =>
                p.MerchantTxnRef == orderCode);


        // ============================================================
        // PAYOS WEBHOOK VALIDATION
        //
        // Khi đăng ký webhook bằng ConfirmAsync, payOS gửi một webhook
        // validation với dữ liệu test (ví dụ orderCode = 123).
        //
        // Signature đã được VerifyWebhookAsync xác minh thành công ở trên.
        // Vì orderCode validation không tồn tại trong DB nên vẫn phải trả
        // true để endpoint trả HTTP 200 cho payOS.
        // ============================================================

        if (payment == null)
        {
            _logger.LogInformation(
                "Webhook payOS hợp lệ nhưng không tìm thấy payment tương ứng. " +
                "Có thể đây là webhook validation của payOS. OrderCode={OrderCode}",
                orderCode);


            return true;
        }


        if (!string.Equals(
            payment.PaymentMethod,
            "PAYOS",
            StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "PaymentId={PaymentId} không phải PAYOS.",
                payment.PaymentId);


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


        if (!string.Equals(
            data.Code,
            "00",
            StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "Webhook payOS không phải giao dịch thành công. OrderCode={OrderCode}, Code={Code}",
                orderCode,
                data.Code);


            return true;
        }


        // payOS có thể retry webhook.
        // Payment SUCCESS rồi thì không xử lý lần thứ hai.

        if (string.Equals(
            payment.Status,
            "SUCCESS",
            StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }


        if (!string.IsNullOrWhiteSpace(data.Reference))
        {
            var existed = await _context.PaymentTransactions
                .AnyAsync(t =>
                    t.Provider == "PAYOS" &&
                    t.ProviderTransactionNo == data.Reference);


            if (existed)
                return true;
        }


        await using var dbTransaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            payment.Status = "SUCCESS";

            payment.PaymentMethod = "PAYOS";

            payment.UpdatedAt = DateTime.UtcNow;


            _context.PaymentTransactions.Add(
                new PaymentTransaction
                {
                    PaymentId = payment.PaymentId,

                    Provider = "PAYOS",

                    ProviderTransactionNo = data.Reference,

                    ResponseCode = data.Code,

                    TransactionStatus = "PAID",

                    BankCode = data.CounterAccountBankId,

                    Amount = data.Amount,

                    Status = "SUCCESS",

                    SignatureValid = true,

                    ProcessedAt = DateTime.UtcNow,

                    CreatedAt = DateTime.UtcNow
                });


            if (payment.Enrollment != null)
            {
                payment.Enrollment.Status = "ACTIVE";

                payment.Enrollment.EnrolledAt = DateTime.UtcNow;

                payment.Enrollment.ExpiresAt =
                    DateTime.UtcNow.AddDays(90);

                payment.Enrollment.UpdatedAt =
                    DateTime.UtcNow;
            }


            await _context.SaveChangesAsync();

            await dbTransaction.CommitAsync();


            _logger.LogInformation(
                "payOS SUCCESS PaymentId={PaymentId}, OrderCode={OrderCode}, Reference={Reference}",
                payment.PaymentId,
                orderCode,
                data.Reference);


            return true;
        }
        catch
        {
            await dbTransaction.RollbackAsync();

            throw;
        }
    }


    public async Task<ApiResponse<PaymentDetailsDto>> GetMyPaymentAsync(
        int currentUserId,
        int paymentId)
    {
        var payment = await _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .FirstOrDefaultAsync(p =>
                p.PaymentId == paymentId);


        if (payment == null)
            return ApiResponse<PaymentDetailsDto>.FailureResponse(
                "Không tìm thấy giao dịch.");


        if (payment.LearnerId != currentUserId)
            return ApiResponse<PaymentDetailsDto>.FailureResponse(
                "Bạn không có quyền xem giao dịch này.");


        var course =
            await _courseCatalog.GetCourseByIdAsync(
                payment.CourseId);


        return ApiResponse<PaymentDetailsDto>.SuccessResponse(
            MapPayment(payment, course));
    }


    public async Task<ApiResponse<PagedResult<PaymentDetailsDto>>> GetMyPaymentHistoryAsync(
        int currentUserId,
        PaymentFilterRequest filter)
    {
        var query = _context.Payments
            .Include(p => p.Learner)
            .Include(p => p.Enrollment)
            .Include(p => p.Transactions)
            .AsNoTracking()
            .Where(p => p.LearnerId == currentUserId);


        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var status =
                filter.Status.Trim().ToUpper();


            query = query.Where(p =>
                p.Status.ToUpper() == status);
        }


        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword =
                filter.Keyword.Trim().ToLower();


            query = query.Where(p =>
                p.MerchantTxnRef.ToLower().Contains(keyword) ||
                p.Transactions.Any(t =>
                    t.ProviderTransactionNo != null &&
                    t.ProviderTransactionNo
                        .ToLower()
                        .Contains(keyword)));
        }


        if (filter.FromDate.HasValue)
            query = query.Where(p =>
                p.CreatedAt >= filter.FromDate.Value);


        if (filter.ToDate.HasValue)
            query = query.Where(p =>
                p.CreatedAt <= filter.ToDate.Value);


        if (filter.MinAmount.HasValue)
            query = query.Where(p =>
                p.Amount >= filter.MinAmount.Value);


        if (filter.MaxAmount.HasValue)
            query = query.Where(p =>
                p.Amount <= filter.MaxAmount.Value);


        var totalItems = await query.CountAsync();


        var page = Math.Max(filter.Page, 1);

        var pageSize =
            Math.Clamp(filter.PageSize, 1, 100);


        var payments = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();


        var items =
            new List<PaymentDetailsDto>();


        foreach (var payment in payments)
        {
            var course =
                await _courseCatalog.GetCourseByIdAsync(
                    payment.CourseId);


            items.Add(
                MapPayment(payment, course));
        }


        return ApiResponse<PagedResult<PaymentDetailsDto>>
            .SuccessResponse(
                new PagedResult<PaymentDetailsDto>
                {
                    Items = items,

                    TotalCount = totalItems,

                    TotalItems = totalItems,

                    TotalPages = totalItems == 0
                        ? 0
                        : (int)Math.Ceiling(
                            totalItems / (double)pageSize),

                    Page = page,

                    PageSize = pageSize
                });
    }


    private static long GenerateOrderCode()
    {
        // 15 digits, đủ nhỏ cho long và phù hợp orderCode dạng integer.

        var prefix =
            DateTime.UtcNow.ToString("yyMMddHHmmss");


        var random =
            RandomNumberGenerator.GetInt32(
                100,
                1000);


        return long.Parse(
            $"{prefix}{random}");
    }


    private static PaymentDetailsDto MapPayment(
        Payment payment,
        CoursePaymentDto? course)
    {
        var transaction =
            payment.Transactions
                .OrderByDescending(t =>
                    t.TransactionId)
                .FirstOrDefault();


        return new PaymentDetailsDto
        {
            PaymentId = payment.PaymentId,


            LearnerId = payment.LearnerId,

            LearnerName =
                payment.Learner?.FullName ??
                string.Empty,

            LearnerEmail =
                payment.Learner?.Email ??
                string.Empty,


            CourseId = payment.CourseId,

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


            Amount = payment.Amount,

            Currency = payment.Currency,

            PaymentMethod =
                payment.PaymentMethod,

            PaymentStatus =
                payment.Status,


            MerchantTxnRef =
                payment.MerchantTxnRef,


            CreatedAt =
                payment.CreatedAt,

            UpdatedAt =
                payment.UpdatedAt,


            LatestTransaction =
                transaction == null
                    ? null
                    : new PaymentTransactionDto
                    {
                        TransactionId =
                            transaction.TransactionId,

                        Provider =
                            transaction.Provider,

                        ProviderTransactionNo =
                            transaction.ProviderTransactionNo,

                        ResponseCode =
                            transaction.ResponseCode,

                        TransactionStatus =
                            transaction.TransactionStatus,

                        BankCode =
                            transaction.BankCode,

                        Amount =
                            transaction.Amount,

                        Status =
                            transaction.Status,

                        SignatureValid =
                            transaction.SignatureValid,

                        ProcessedAt =
                            transaction.ProcessedAt ??
                            transaction.CreatedAt
                    }
        };
    }
}