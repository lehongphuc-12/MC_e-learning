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

public class EnrollmentService : IEnrollmentService
{
    private readonly SmartMcDbContext _context;
    private readonly ICourseCatalogService _courseCatalog;

    public EnrollmentService(SmartMcDbContext context, ICourseCatalogService courseCatalog)
    {
        _context = context;
        _courseCatalog = courseCatalog;
    }

    public async Task<ApiResponse<EnrollmentDto>> EnrollCourseAsync(int learnerId, int courseId)
    {
        var course = await _courseCatalog.GetCourseByIdAsync(courseId);
        if (course == null || course.Status != "PUBLISHED")
        {
            return ApiResponse<EnrollmentDto>.FailureResponse("Khóa học không tồn tại hoặc chưa mở đăng ký.");
        }

        var latestEnrollment = await _context.Enrollments
            .Where(e => e.LearnerId == learnerId && e.CourseId == courseId)
            .OrderByDescending(e => e.EnrollmentId)
            .FirstOrDefaultAsync();

        if (latestEnrollment != null)
        {
            // Kiểm tra hạn 90 ngày (3 tháng)
            if (latestEnrollment.Status == "ACTIVE" && latestEnrollment.ExpiresAt.HasValue && DateTime.UtcNow > latestEnrollment.ExpiresAt.Value)
            {
                latestEnrollment.Status = "EXPIRED";
                latestEnrollment.UpdatedAt = DateTime.UtcNow;
                _context.Enrollments.Update(latestEnrollment);
                await _context.SaveChangesAsync();
                // Khóa cũ đã hết hạn, chạy tiếp xuống dưới để tạo đơn mua lại mới
            }
            else if (latestEnrollment.Status == "ACTIVE")
            {
                var daysRemaining = latestEnrollment.ExpiresAt.HasValue 
                    ? (int)Math.Max(0, (latestEnrollment.ExpiresAt.Value - DateTime.UtcNow).TotalDays) 
                    : 0;

                return ApiResponse<EnrollmentDto>.FailureResponse(
                    $"Bạn đã đăng ký khóa học này rồi. Hạn học còn {daysRemaining} ngày (đến {latestEnrollment.ExpiresAt:dd/MM/yyyy})."
                );
            }
            else if (latestEnrollment.Status == "PENDING_PAYMENT")
            {
                return ApiResponse<EnrollmentDto>.SuccessResponse(
                    MapToDto(latestEnrollment),
                    "Bạn đã có đơn đăng ký đang chờ thanh toán."
                );
            }
        }

        var newEnrollment = new Enrollment
        {
            LearnerId = learnerId,
            CourseId = courseId,
            Status = "PENDING_PAYMENT",
            CompletionPercentage = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Enrollments.AddAsync(newEnrollment);
        await _context.SaveChangesAsync();

        return ApiResponse<EnrollmentDto>.SuccessResponse(MapToDto(newEnrollment), "Đăng ký khóa học thành công. Vui lòng thanh toán.");
    }

    public async Task<ApiResponse<List<EnrollmentDto>>> GetMyEnrollmentsAsync(int learnerId)
    {
        var enrollments = await _context.Enrollments
            .Where(e => e.LearnerId == learnerId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var hasChanges = false;

        foreach (var item in enrollments.Where(e => e.Status == "ACTIVE" && e.ExpiresAt.HasValue && now > e.ExpiresAt.Value))
        {
            item.Status = "EXPIRED";
            item.UpdatedAt = now;
            _context.Enrollments.Update(item);
            hasChanges = true;
        }

        if (hasChanges)
        {
            await _context.SaveChangesAsync();
        }

        var result = enrollments.Select(MapToDto).ToList();
        return ApiResponse<List<EnrollmentDto>>.SuccessResponse(result);
    }

    public async Task<ApiResponse<bool>> CancelPendingEnrollmentAsync(int learnerId, int enrollmentId)
    {
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.EnrollmentId == enrollmentId && e.LearnerId == learnerId);

        if (enrollment == null)
        {
            return ApiResponse<bool>.FailureResponse("Không tìm thấy đơn đăng ký của bạn.");
        }

        if (enrollment.Status == "ACTIVE")
        {
            return ApiResponse<bool>.FailureResponse("Khóa học đã kích hoạt thành công, không thể tự hủy.");
        }

        if (enrollment.Status == "CANCELLED")
        {
            return ApiResponse<bool>.FailureResponse("Đơn đăng ký này đã được hủy trước đó.");
        }

        if (enrollment.Status != "PENDING_PAYMENT")
        {
            return ApiResponse<bool>.FailureResponse($"Trạng thái hiện tại ({enrollment.Status}) không hỗ trợ thao tác hủy.");
        }

        enrollment.Status = "CANCELLED";
        enrollment.UpdatedAt = DateTime.UtcNow;
        _context.Enrollments.Update(enrollment);

        var pendingPayment = await _context.Payments
            .FirstOrDefaultAsync(p => p.EnrollmentId == enrollmentId && p.Status == "PENDING");

        if (pendingPayment != null)
        {
            pendingPayment.Status = "CANCELLED";
            pendingPayment.UpdatedAt = DateTime.UtcNow;
            _context.Payments.Update(pendingPayment);
        }

        await _context.SaveChangesAsync();
        return ApiResponse<bool>.SuccessResponse(true, "Hủy đơn đăng ký chờ thanh toán thành công.");
    }

    public async Task<ApiResponse<bool>> RevokeEnrollmentByAdminAsync(int enrollmentId, RevokeEnrollmentRequest request)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.Payment)
            .FirstOrDefaultAsync(e => e.EnrollmentId == enrollmentId);

        if (enrollment == null)
        {
            return ApiResponse<bool>.FailureResponse("Không tìm thấy thông tin đăng ký khóa học.");
        }

        if (enrollment.Status == "REVOKED" || enrollment.Status == "REFUNDED")
        {
            return ApiResponse<bool>.FailureResponse("Khóa học này đã bị thu hồi hoặc hoàn tiền từ trước.");
        }

        var targetStatus = request.IsRefunded ? "REFUNDED" : "REVOKED";
        enrollment.Status = targetStatus;
        enrollment.UpdatedAt = DateTime.UtcNow;
        enrollment.ExpiresAt = DateTime.UtcNow; // Hết hạn ngay lập tức
        _context.Enrollments.Update(enrollment);

        if (enrollment.Payment != null)
        {
            enrollment.Payment.Status = targetStatus;
            enrollment.Payment.UpdatedAt = DateTime.UtcNow;
            _context.Payments.Update(enrollment.Payment);
        }

        await _context.SaveChangesAsync();
        return ApiResponse<bool>.SuccessResponse(true, $"Đã thu hồi quyền học thành công ({targetStatus}). Lý do: {request.Reason}");
    }

    public async Task<bool> HasActiveAccessAsync(int learnerId, int courseId)
    {
        var enrollment = await _context.Enrollments
            .Where(e => e.LearnerId == learnerId && e.CourseId == courseId)
            .OrderByDescending(e => e.EnrollmentId)
            .FirstOrDefaultAsync();

        if (enrollment == null || enrollment.Status != "ACTIVE")
        {
            return false;
        }

        if (enrollment.ExpiresAt.HasValue && DateTime.UtcNow > enrollment.ExpiresAt.Value)
        {
            enrollment.Status = "EXPIRED";
            enrollment.UpdatedAt = DateTime.UtcNow;
            _context.Enrollments.Update(enrollment);
            await _context.SaveChangesAsync();
            return false;
        }

        return true;
    }

    private static EnrollmentDto MapToDto(Enrollment e) => new()
    {
        EnrollmentId = e.EnrollmentId,
        LearnerId = e.LearnerId,
        CourseId = e.CourseId,
        PaymentId = e.PaymentId,
        Status = e.Status,
        CompletionPercentage = e.CompletionPercentage,
        EnrolledAt = e.EnrolledAt,
        ExpiresAt = e.ExpiresAt,
        CreatedAt = e.CreatedAt
    };
}