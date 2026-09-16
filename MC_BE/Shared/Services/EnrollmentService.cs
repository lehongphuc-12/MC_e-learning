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

        var now = DateTime.UtcNow;

        if (latestEnrollment != null)
        {
            if (latestEnrollment.Status == "ACTIVE")
            {
                if (latestEnrollment.ExpiresAt.HasValue && now > latestEnrollment.ExpiresAt.Value)
                {
                    latestEnrollment.Status = "EXPIRED";
                    latestEnrollment.UpdatedAt = now;
                    _context.Enrollments.Update(latestEnrollment);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    var daysRemaining = latestEnrollment.ExpiresAt.HasValue 
                        ? (int)Math.Max(0, (latestEnrollment.ExpiresAt.Value - now).TotalDays) 
                        : 0;

                    return ApiResponse<EnrollmentDto>.FailureResponse(
                        $"Bạn đã đăng ký khóa học này rồi. Hạn học còn {daysRemaining} ngày (đến {latestEnrollment.ExpiresAt:dd/MM/yyyy})."
                    );
                }
            }
            else if (latestEnrollment.Status == "PENDING_PAYMENT")
            {
                return ApiResponse<EnrollmentDto>.SuccessResponse(
                    MapToDto(latestEnrollment),
                    "Bạn đã có đơn đăng ký đang chờ thanh toán."
                );
            }
        }

        var isFreeCourse = course.Price <= 0;
        var newEnrollment = new Enrollment
        {
            LearnerId = learnerId,
            CourseId = courseId,
            Status = isFreeCourse ? "ACTIVE" : "PENDING_PAYMENT",
            CompletionPercentage = 0,
            EnrolledAt = isFreeCourse ? now : null,
            ExpiresAt = isFreeCourse ? now.AddDays(90) : null,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _context.Enrollments.AddAsync(newEnrollment);
        await _context.SaveChangesAsync();

        var message = isFreeCourse 
            ? "Đăng ký khóa học thành công! Bạn có thể bắt đầu học ngay." 
            : "Đăng ký khóa học thành công. Vui lòng thanh toán để kích hoạt.";

        return ApiResponse<EnrollmentDto>.SuccessResponse(MapToDto(newEnrollment), message);
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

        var now = DateTime.UtcNow;
        enrollment.Status = "CANCELLED";
        enrollment.UpdatedAt = now;
        _context.Enrollments.Update(enrollment);

        var pendingPayment = await _context.Payments
            .FirstOrDefaultAsync(p => p.EnrollmentId == enrollmentId && p.Status == "PENDING");

        if (pendingPayment != null)
        {
            pendingPayment.Status = "CANCELLED";
            pendingPayment.UpdatedAt = now;
            _context.Payments.Update(pendingPayment);
        }

        await _context.SaveChangesAsync();
        return ApiResponse<bool>.SuccessResponse(true, "Hủy đơn đăng ký chờ thanh toán thành công.");
    }

    public async Task<ApiResponse<bool>> RevokeEnrollmentByAdminAsync(int enrollmentId, RevokeEnrollmentRequest request)
    {
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.EnrollmentId == enrollmentId);

        if (enrollment == null)
        {
            return ApiResponse<bool>.FailureResponse("Không tìm thấy thông tin đăng ký khóa học.");
        }

        if (enrollment.Status == "REVOKED" || enrollment.Status == "REFUNDED")
        {
            return ApiResponse<bool>.FailureResponse("Khóa học này đã bị thu hồi hoặc hoàn tiền từ trước.");
        }

        var now = DateTime.UtcNow;
        var targetStatus = request.IsRefunded ? "REFUNDED" : "REVOKED";
        enrollment.Status = targetStatus;
        enrollment.UpdatedAt = now;
        enrollment.ExpiresAt = now;
        _context.Enrollments.Update(enrollment);

        var payment = await _context.Payments.FirstOrDefaultAsync(p => p.EnrollmentId == enrollmentId);
        if (payment != null)
        {
            payment.Status = targetStatus;
            payment.UpdatedAt = now;
            _context.Payments.Update(payment);
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
        CompletionPercentage = Convert.ToDecimal(e.CompletionPercentage),
        EnrolledAt = e.EnrolledAt,
        ExpiresAt = e.ExpiresAt,
        CreatedAt = e.CreatedAt
    };
}