using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Shared.Services;

public class EnrollmentService : IEnrollmentService
{
    private readonly SmartMcDbContext _context;
    private readonly ICourseCatalogService _courseCatalog;
    private readonly ICourseGiftAccessService _giftAccess;

    public EnrollmentService(
        SmartMcDbContext context,
        ICourseCatalogService courseCatalog,
        ICourseGiftAccessService giftAccess)
    {
        _context = context;
        _courseCatalog = courseCatalog;
        _giftAccess = giftAccess;
    }

    public async Task<ApiResponse<EnrollmentDto>> EnrollCourseAsync(
        int learnerId,
        int courseId)
    {
        // ============================================================
        // 1. VALIDATE COURSE ID
        // ============================================================

        if (courseId <= 0)
        {
            return ApiResponse<EnrollmentDto>.FailureResponse(
                "CourseID không hợp lệ."
            );
        }

        // Kiểm tra trực tiếp DB để tránh lỗi foreign key khi INSERT.
        var courseExistsInDatabase = await _context.Courses
            .AsNoTracking()
            .AnyAsync(c => c.CourseId == courseId);

        if (!courseExistsInDatabase)
        {
            return ApiResponse<EnrollmentDto>.FailureResponse(
                $"Không tìm thấy khóa học có CourseID = {courseId} trong hệ thống."
            );
        }

        // Lấy thông tin khóa học thông qua catalog như logic cũ.
        var course = await _courseCatalog.GetCourseByIdAsync(courseId);

        if (course == null)
        {
            return ApiResponse<EnrollmentDto>.FailureResponse(
                $"Không tìm thấy khóa học có CourseID = {courseId}."
            );
        }

        if (!string.Equals(
            course.Status,
            "PUBLISHED",
            StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<EnrollmentDto>.FailureResponse(
                "Khóa học chưa mở đăng ký."
            );
        }

        // ============================================================
        // 2. KIỂM TRA ENROLLMENT GẦN NHẤT
        // ============================================================

        var latestEnrollment = await _context.Enrollments
            .Where(e =>
                e.LearnerId == learnerId &&
                e.CourseId == courseId
            )
            .OrderByDescending(e => e.EnrollmentId)
            .FirstOrDefaultAsync();

        var now = DateTime.UtcNow;

        if (latestEnrollment != null)
        {
            var hadPaidAccess = latestEnrollment.ExpiresAt.HasValue &&
                latestEnrollment.ExpiresAt.Value <= now &&
                (latestEnrollment.Status == "ACTIVE" || latestEnrollment.Status == "COMPLETED");

            if (hadPaidAccess)
            {
                latestEnrollment.Status = "EXPIRED";
                latestEnrollment.UpdatedAt = now;
                await _context.SaveChangesAsync();
            }

            if (latestEnrollment.Status == "EXPIRED")
            {
                // Reuse the enrollment so the learner's lesson progress, attempts,
                // certificate link, and payment history remain attached to one record.
                return ApiResponse<EnrollmentDto>.SuccessResponse(
                    MapToDto(latestEnrollment),
                    "Quyền học đã hết hạn. Bạn có thể mua lại khóa học để mở quyền truy cập thêm 3 tháng; tiến độ và lịch sử học được giữ nguyên.");
            }

            if (latestEnrollment.Status == "ACTIVE" || latestEnrollment.Status == "COMPLETED")
            {
                var giftOnlyAccess = await _giftAccess.IsGiftOnlyAccessAsync(courseId, learnerId, now);
                if (giftOnlyAccess && await _giftAccess.IsGiftCourseAsync(courseId))
                {
                    var giftedDto = MapToDto(latestEnrollment);
                    giftedDto.IsAccessGranted = true;
                    giftedDto.CanPurchaseDirectly = true;
                    return ApiResponse<EnrollmentDto>.SuccessResponse(
                        giftedDto,
                        "Bạn đang được tặng khóa AI. Bạn có thể mua riêng để giữ quyền truy cập độc lập.");
                }

                var daysRemaining = latestEnrollment.ExpiresAt.HasValue
                    ? (int)Math.Max(0, (latestEnrollment.ExpiresAt.Value - now).TotalDays)
                    : 0;
                return ApiResponse<EnrollmentDto>.FailureResponse(
                    $"Bạn đã đăng ký khóa học này rồi. Hạn học còn {daysRemaining} ngày (đến {latestEnrollment.ExpiresAt:dd/MM/yyyy}).");
            }
            else if (
                latestEnrollment.Status == "PENDING_PAYMENT"
            )
            {
                return ApiResponse<EnrollmentDto>.SuccessResponse(
                    MapToDto(latestEnrollment),
                    "Bạn đã có đơn đăng ký đang chờ thanh toán."
                );
            }
        }

        // ============================================================
        // 3. TẠO ENROLLMENT
        // ============================================================

        var isFreeCourse = course.IsFree;

        var newEnrollment = new Enrollment
        {
            LearnerId = learnerId,
            CourseId = courseId,

            Status = isFreeCourse
                ? "ACTIVE"
                : "PENDING_PAYMENT",

            CompletionPercentage = 0,

            EnrolledAt = isFreeCourse
                ? now
                : null,

            // Free enrollment has no purchase window. Paid access starts on confirmed payment.
            ExpiresAt = null,

            CreatedAt = now,
            UpdatedAt = now
        };

        await _context.Enrollments.AddAsync(newEnrollment);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _context.Entry(newEnrollment).State = EntityState.Detached;

            var existingEnrollment = await _context.Enrollments
                .AsNoTracking()
                .Where(e =>
                    e.LearnerId == learnerId &&
                    e.CourseId == courseId &&
                    (e.Status == "ACTIVE" ||
                     e.Status == "PENDING_PAYMENT"))
                .OrderByDescending(e => e.EnrollmentId)
                .FirstOrDefaultAsync();

            if (existingEnrollment != null)
            {
                if (existingEnrollment.Status == "PENDING_PAYMENT")
                {
                    return ApiResponse<EnrollmentDto>.SuccessResponse(
                        MapToDto(existingEnrollment),
                        "Bạn đã có đơn đăng ký đang chờ thanh toán.");
                }

                return ApiResponse<EnrollmentDto>.FailureResponse(
                    "Bạn đã đăng ký khóa học này rồi.");
            }

            throw;
        }

        // ============================================================
        // 4. RESPONSE
        // ============================================================

        var message = isFreeCourse
            ? "Đăng ký khóa học thành công! Bạn có thể bắt đầu học ngay."
            : "Đăng ký khóa học thành công. Vui lòng thanh toán để kích hoạt.";

        return ApiResponse<EnrollmentDto>.SuccessResponse(
            MapToDto(newEnrollment),
            message
        );
    }

    public async Task<ApiResponse<List<EnrollmentDto>>> GetMyEnrollmentsAsync(
        int learnerId)
    {
        var enrollments = await _context.Enrollments
            .Where(e => e.LearnerId == learnerId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var hasChanges = false;

        foreach (
            var item in enrollments.Where(e =>
                e.Status == "ACTIVE" &&
                e.ExpiresAt.HasValue &&
                now > e.ExpiresAt.Value
            )
        )
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

        var enrollmentCourseIds = enrollments.Select(e => e.CourseId).Distinct().ToList();
        var managedCourseIds = await _context.CourseGiftPolicies
            .Where(p => enrollmentCourseIds.Contains(p.GiftCourseId))
            .Select(p => p.GiftCourseId)
            .Union(_context.CourseAccessGrants.Where(g => enrollmentCourseIds.Contains(g.CourseId)).Select(g => g.CourseId))
            .Distinct()
            .ToListAsync();
        var activeGrantCourseIds = await _context.CourseAccessGrants
            .Where(g => enrollmentCourseIds.Contains(g.CourseId) && g.LearnerId == learnerId && g.Status == "ACTIVE" &&
                (!g.ExpiresAt.HasValue || g.ExpiresAt.Value > now))
            .Select(g => g.CourseId)
            .Distinct()
            .ToListAsync();
        var activeGiftGrantCourseIds = await _context.CourseAccessGrants
            .Where(g => enrollmentCourseIds.Contains(g.CourseId) && g.LearnerId == learnerId && g.Status == "ACTIVE" &&
                g.SourceType == "GIFT" && (!g.ExpiresAt.HasValue || g.ExpiresAt.Value > now))
            .Select(g => g.CourseId).Distinct().ToListAsync();
        var activePurchaseGrantCourseIds = await _context.CourseAccessGrants
            .Where(g => enrollmentCourseIds.Contains(g.CourseId) && g.LearnerId == learnerId && g.Status == "ACTIVE" &&
                g.SourceType == "DIRECT_PURCHASE" && (!g.ExpiresAt.HasValue || g.ExpiresAt.Value > now))
            .Select(g => g.CourseId).Distinct().ToListAsync();
        var managed = managedCourseIds.ToHashSet();
        var activeGrants = activeGrantCourseIds.ToHashSet();
        var activeGiftGrants = activeGiftGrantCourseIds.ToHashSet();
        var activePurchaseGrants = activePurchaseGrantCourseIds.ToHashSet();
        foreach (var dto in result)
        {
            dto.IsAccessGranted = managed.Contains(dto.CourseId)
                ? activeGrants.Contains(dto.CourseId)
                : (dto.Status == "ACTIVE" || dto.Status == "COMPLETED") && (!dto.ExpiresAt.HasValue || dto.ExpiresAt.Value > now);
            dto.CanPurchaseDirectly = managed.Contains(dto.CourseId) && activeGiftGrants.Contains(dto.CourseId) &&
                !activePurchaseGrants.Contains(dto.CourseId);
        }

        return ApiResponse<List<EnrollmentDto>>.SuccessResponse(
            result
        );
    }

    public async Task<ApiResponse<bool>> CancelPendingEnrollmentAsync(
        int learnerId,
        int enrollmentId)
    {
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e =>
                e.EnrollmentId == enrollmentId &&
                e.LearnerId == learnerId
            );

        if (enrollment == null)
        {
            return ApiResponse<bool>.FailureResponse(
                "Không tìm thấy đơn đăng ký của bạn."
            );
        }

        if (enrollment.Status == "ACTIVE")
        {
            return ApiResponse<bool>.FailureResponse(
                "Khóa học đã kích hoạt thành công, không thể tự hủy."
            );
        }

        if (enrollment.Status == "CANCELLED")
        {
            return ApiResponse<bool>.FailureResponse(
                "Đơn đăng ký này đã được hủy trước đó."
            );
        }

        if (enrollment.Status != "PENDING_PAYMENT")
        {
            return ApiResponse<bool>.FailureResponse(
                $"Trạng thái hiện tại ({enrollment.Status}) không hỗ trợ thao tác hủy."
            );
        }

        var now = DateTime.UtcNow;

        enrollment.Status = "CANCELLED";
        enrollment.UpdatedAt = now;

        _context.Enrollments.Update(enrollment);

        var pendingPayment = await _context.Payments
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p =>
                p.Items.Any(i => i.EnrollmentId == enrollmentId) &&
                p.Status == "PENDING"
            );

        if (pendingPayment != null)
        {
            pendingPayment.Status = "CANCELLED";
            pendingPayment.UpdatedAt = now;

            _context.Payments.Update(pendingPayment);
        }

        await _context.SaveChangesAsync();

        return ApiResponse<bool>.SuccessResponse(
            true,
            "Hủy đơn đăng ký chờ thanh toán thành công."
        );
    }

    public async Task<ApiResponse<bool>> RevokeEnrollmentByAdminAsync(
        int enrollmentId,
        RevokeEnrollmentRequest request)
    {
        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e =>
                e.EnrollmentId == enrollmentId
            );

        if (enrollment == null)
        {
            return ApiResponse<bool>.FailureResponse(
                "Không tìm thấy thông tin đăng ký khóa học."
            );
        }

        if (
            enrollment.Status == "REVOKED" ||
            enrollment.Status == "REFUNDED"
        )
        {
            return ApiResponse<bool>.FailureResponse(
                "Khóa học này đã bị thu hồi hoặc hoàn tiền từ trước."
            );
        }

        var now = DateTime.UtcNow;

        var targetStatus = request.IsRefunded
            ? "REFUNDED"
            : "REVOKED";

        enrollment.Status = targetStatus;
        enrollment.UpdatedAt = now;
        enrollment.ExpiresAt = now;

        _context.Enrollments.Update(enrollment);

        var payment = await _context.Payments
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p =>
                p.Items.Any(i => i.EnrollmentId == enrollmentId)
            );

        if (payment != null)
        {
            payment.Status = targetStatus;
            payment.UpdatedAt = now;

            _context.Payments.Update(payment);
        }

        await _context.SaveChangesAsync();

        return ApiResponse<bool>.SuccessResponse(
            true,
            $"Đã thu hồi quyền học thành công ({targetStatus}). Lý do: {request.Reason}"
        );
    }

    public async Task<bool> HasActiveAccessAsync(
        int learnerId,
        int courseId)
    {
        var enrollment = await _context.Enrollments
            .Where(e =>
                e.LearnerId == learnerId &&
                e.CourseId == courseId
            )
            .OrderByDescending(e => e.EnrollmentId)
            .FirstOrDefaultAsync();

        if (
            enrollment == null ||
            enrollment.Status != "ACTIVE"
        )
        {
            return false;
        }

        if (
            enrollment.ExpiresAt.HasValue &&
            DateTime.UtcNow > enrollment.ExpiresAt.Value
        )
        {
            enrollment.Status = "EXPIRED";
            enrollment.UpdatedAt = DateTime.UtcNow;

            _context.Enrollments.Update(enrollment);

            await _context.SaveChangesAsync();

            return false;
        }

        return true;
    }

    // Instructor: danh sách học viên đã kích hoạt của khóa học.
    public async Task<ApiResponse<List<CourseEnrolledStudentDto>>> GetCourseStudentsAsync(int instructorId, int courseId)
    {
        if (courseId <= 0) return ApiResponse<List<CourseEnrolledStudentDto>>.FailureResponse("CourseID không hợp lệ.");
        var course = await _context.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.CourseId == courseId);
        if (course == null) return ApiResponse<List<CourseEnrolledStudentDto>>.FailureResponse("Không tìm thấy khóa học.");
        if (course.InstructorId != instructorId) return ApiResponse<List<CourseEnrolledStudentDto>>.FailureResponse("Bạn không có quyền xem học viên khóa học này.");

        var now = DateTime.UtcNow;
        var data = await (from e in _context.Enrollments.AsNoTracking()
                          join u in _context.Users.AsNoTracking() on e.LearnerId equals u.UserId
                          where e.CourseId == courseId && e.Status == "ACTIVE" && (!e.ExpiresAt.HasValue || e.ExpiresAt.Value >= now)
                          select new { e, u }).ToListAsync();
        var rows = data.Select(x => new CourseEnrolledStudentDto
        {
            EnrollmentId = x.e.EnrollmentId, CourseId = x.e.CourseId, UserId = x.e.LearnerId,
            FullName = x.u.FullName, Email = x.u.Email, AvatarUrl = x.u.AvatarUrl,
            EnrolledAt = x.e.EnrolledAt, EnrollmentStatus = x.e.Status,
            CompletionPercentage = Convert.ToDecimal(x.e.CompletionPercentage)
        }).ToList();
        var students = rows.GroupBy(x => x.UserId).Select(g => g.OrderByDescending(x => x.EnrollmentId).First()).OrderBy(x => x.FullName).ToList();
        return ApiResponse<List<CourseEnrolledStudentDto>>.SuccessResponse(students);
    }

    public async Task<ApiResponse<List<CourseStudentInsightDto>>> GetCourseStudentInsightsAsync(int instructorId, int courseId)
    {
        if (courseId <= 0) return ApiResponse<List<CourseStudentInsightDto>>.FailureResponse("CourseID không hợp lệ.");
        var course = await _context.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.CourseId == courseId);
        if (course == null) return ApiResponse<List<CourseStudentInsightDto>>.FailureResponse("Không tìm thấy khóa học.");
        if (course.InstructorId != instructorId) return ApiResponse<List<CourseStudentInsightDto>>.FailureResponse("Bạn không có quyền xem học viên khóa học này.");

        var now = DateTime.UtcNow;
        var enrollments = await _context.Enrollments.AsNoTracking()
            .Include(e => e.LessonProgresses)
            .Where(e => e.CourseId == courseId && e.Status == "ACTIVE" && (!e.ExpiresAt.HasValue || e.ExpiresAt.Value >= now))
            .ToListAsync();
        if (enrollments.Count == 0)
            return ApiResponse<List<CourseStudentInsightDto>>.SuccessResponse(new List<CourseStudentInsightDto>());

        var userIds = enrollments.Select(e => e.LearnerId).Distinct().ToList();
        var users = await _context.Users.AsNoTracking().Where(u => userIds.Contains(u.UserId))
            .ToDictionaryAsync(u => u.UserId);
        var modules = await _context.Modules.AsNoTracking().Where(m => m.CourseId == courseId).Select(m => m.ModuleId).ToListAsync();
        var lessons = await _context.Lessons.AsNoTracking().Where(l => l.CourseId == courseId && l.Status == LessonStatus.ACTIVE && !l.IsRemedial).ToListAsync();
        var lessonIds = lessons.Select(l => l.LessonId).ToList();

        var quizzes = await _context.Quizzes.AsNoTracking()
            .Where(q => (q.Status == QuizStatus.ACTIVE ||
                    (q.Status == QuizStatus.INACTIVE && q.AvailableUntil.HasValue && q.AvailableUntil.Value <= now)) &&
                !q.IsRemedial &&
                (q.CourseId == courseId || (q.ModuleId.HasValue && modules.Contains(q.ModuleId.Value)) || (q.LessonId.HasValue && lessonIds.Contains(q.LessonId.Value))))
            .Select(q => new { q.QuizId, q.Title, q.AvailableUntil, q.MaxAttempts })
            .ToListAsync();
        var scripts = await _context.SpeakingScripts.AsNoTracking()
            .Where(s => s.CourseId == courseId && s.Status == SpeakingScriptStatus.PUBLISHED && !s.IsRemedial)
            .Select(s => new { s.ScriptId, s.Title, s.DueAt })
            .ToListAsync();
        var quizIds = quizzes.Select(q => q.QuizId).ToList();
        var scriptIds = scripts.Select(s => s.ScriptId).ToList();
        var quizAttempts = quizIds.Count == 0 ? new List<QuizAttempt>() : await _context.QuizAttempts.AsNoTracking()
            .Where(a => userIds.Contains(a.UserId) && quizIds.Contains(a.QuizId)).ToListAsync();
        var speakingSubmissions = scriptIds.Count == 0 ? new List<SpeakingSubmission>() : await _context.SpeakingSubmissions.AsNoTracking()
            .Where(s => userIds.Contains(s.LearnerId) && s.ScriptId.HasValue && scriptIds.Contains(s.ScriptId.Value)).ToListAsync();

        var result = new List<CourseStudentInsightDto>();
        foreach (var enrollment in enrollments)
        {
            if (!users.TryGetValue(enrollment.LearnerId, out var user)) continue;
            var assessments = new List<StudentAssessmentInsightDto>();
            foreach (var quiz in quizzes)
            {
                var attempts = quizAttempts.Where(a => a.UserId == enrollment.LearnerId && a.QuizId == quiz.QuizId).ToList();
                var graded = attempts.Where(a => a.SubmittedAt.HasValue && a.Score.HasValue).ToList();
                var bestScore = graded.Select(a => a.Score).Max();
                var pending = attempts.Any(a => a.ResultStatus == QuizAttemptStatus.PENDING_GRADING && a.SubmittedAt.HasValue);
                var latest = attempts.OrderByDescending(a => a.AttemptNumber).FirstOrDefault();
                var latestScore = latest?.Score;
                var hasPassed = attempts.Any(a => a.ResultStatus == QuizAttemptStatus.PASSED);
                var attemptLimitReached = quiz.MaxAttempts > 0 && attempts.Count(a => a.SubmittedAt.HasValue) >= quiz.MaxAttempts && !hasPassed;
                var assessmentStatus = ResolveAssessmentStatus(hasPassed, pending, latest?.ResultStatus?.ToString(), attempts.Any(a => a.SubmittedAt.HasValue), quiz.AvailableUntil, now);
                assessments.Add(new StudentAssessmentInsightDto
                {
                    AssessmentType = "QUIZ", AssessmentId = quiz.QuizId, Title = quiz.Title,
                    BestScore = bestScore, LatestScore = latestScore, MaxAttempts = quiz.MaxAttempts,
                    AttemptLimitReached = attemptLimitReached, DueAt = quiz.AvailableUntil,
                    LastSubmittedAt = attempts.Where(a => a.SubmittedAt.HasValue).Select(a => a.SubmittedAt).Max(),
                    AttemptCount = attempts.Count(a => a.SubmittedAt.HasValue),
                    Status = assessmentStatus
                });
            }
            foreach (var script in scripts)
            {
                var attempts = speakingSubmissions.Where(s => s.LearnerId == enrollment.LearnerId && s.ScriptId == script.ScriptId).ToList();
                var latest = attempts.OrderByDescending(s => s.SubmittedAt).FirstOrDefault();
                var bestScore = attempts.Where(s => s.Score.HasValue).Select(s => s.Score).Max();
                var latestScore = latest?.Score;
                var pending = latest != null && !latest.Score.HasValue;
                assessments.Add(new StudentAssessmentInsightDto
                {
                    AssessmentType = "SPEAKING", AssessmentId = script.ScriptId, Title = script.Title,
                    BestScore = bestScore, LatestScore = latestScore, DueAt = script.DueAt,
                    LastSubmittedAt = latest?.SubmittedAt, AttemptCount = attempts.Count,
                    Status = ResolveAssessmentStatus(attempts.Any(s => s.Score >= 80), pending, latest?.Status.ToString(), latest != null, script.DueAt, now)
                });
            }

            var failedCount = assessments.Count(a => a.Status == "NEEDS_REMEDIATION");
            var overdueCount = assessments.Count(a => a.Status == "OVERDUE");
            var exhaustedCount = assessments.Count(a => a.AttemptLimitReached);
            var pendingCount = assessments.Count(a => a.Status == "PENDING_GRADE");
            var passedCount = assessments.Count(a => a.Status == "PASSED");
            var reasons = new List<string>();
            foreach (var assessment in assessments.Where(a => a.Status == "OVERDUE" || a.Status == "NEEDS_REMEDIATION"))
            {
                var kind = assessment.AssessmentType == "QUIZ" ? "Quiz" : "Speaking assignment";
                if (assessment.Status == "OVERDUE")
                    reasons.Add($"{kind} ‘{assessment.Title}’ đã quá hạn ({assessment.DueAt:dd/MM/yyyy}) nhưng chưa đạt.");
                else
                    reasons.Add($"{kind} ‘{assessment.Title}’ chưa đạt 80 điểm; điểm gần nhất {assessment.LatestScore?.ToString("0.##") ?? "chưa có"}/100.");
                if (assessment.AttemptLimitReached)
                    reasons.Add($"{kind} ‘{assessment.Title}’ đã hết {assessment.MaxAttempts} lượt làm.");
            }
            if (pendingCount > 0) reasons.Add($"{pendingCount} bài đang chờ giảng viên chấm.");
            var risk = assessments.Count == 0 ? "INSUFFICIENT_DATA"
                : exhaustedCount > 0 || overdueCount >= 2 || failedCount >= 2 ? "DANGER"
                : overdueCount > 0 || failedCount > 0 ? "WARNING" : "SAFE";
            if (risk == "SAFE" && assessments.Count > 0) reasons.Add("Không có bài đánh giá quá hạn hoặc chưa đạt.");
            if (risk == "INSUFFICIENT_DATA") reasons.Add("Khóa học chưa có bài đánh giá bắt buộc để phân loại.");

            var lessonActivity = enrollment.LessonProgresses.Select(p => p.LastAccessedAt).Where(d => d.HasValue).Select(d => d!.Value);
            var quizActivity = quizAttempts.Where(a => a.UserId == enrollment.LearnerId && a.SubmittedAt.HasValue).Select(a => a.SubmittedAt!.Value);
            var speakingActivity = speakingSubmissions.Where(s => s.LearnerId == enrollment.LearnerId).Select(s => s.SubmittedAt);
            var lastActivity = lessonActivity.Concat(quizActivity).Concat(speakingActivity).DefaultIfEmpty().Max();

            result.Add(new CourseStudentInsightDto
            {
                EnrollmentId = enrollment.EnrollmentId, CourseId = courseId, UserId = user.UserId,
                FullName = user.FullName, Email = user.Email, AvatarUrl = user.AvatarUrl,
                EnrolledAt = enrollment.EnrolledAt, CompletionPercentage = Convert.ToDecimal(enrollment.CompletionPercentage),
                AssessmentCount = assessments.Count, PassedAssessmentCount = passedCount,
                FailedAssessmentCount = failedCount, OverdueAssessmentCount = overdueCount, PendingGradeCount = pendingCount,
                RiskStatus = risk, RiskReasons = reasons, Assessments = assessments,
                LastActivityAt = lastActivity == default ? null : lastActivity
            });
        }
        return ApiResponse<List<CourseStudentInsightDto>>.SuccessResponse(result.OrderBy(x => x.FullName).ToList());
    }

    private static string ResolveAssessmentStatus(bool hasPassed, bool pending, string? latestStatus, bool hasSubmission, DateTime? dueAt, DateTime now)
    {
        if (hasPassed) return "PASSED";
        if (pending) return "PENDING_GRADE";
        if (dueAt.HasValue && dueAt.Value <= now) return "OVERDUE";
        if (hasSubmission && (string.Equals(latestStatus, "FAILED", StringComparison.OrdinalIgnoreCase) || string.Equals(latestStatus, "NEEDS_RESUBMISSION", StringComparison.OrdinalIgnoreCase))) return "NEEDS_REMEDIATION";
        if (hasSubmission) return "IN_PROGRESS";
        return "NOT_STARTED";
    }

    private static EnrollmentDto MapToDto(
        Enrollment enrollment)
    {
        return new EnrollmentDto
        {
            EnrollmentId = enrollment.EnrollmentId,
            LearnerId = enrollment.LearnerId,
            CourseId = enrollment.CourseId,
            PaymentId = null,
            Status = enrollment.Status,
            CompletionPercentage =
                Convert.ToDecimal(
                    enrollment.CompletionPercentage
                ),
            EnrolledAt = enrollment.EnrolledAt,
            ExpiresAt = enrollment.ExpiresAt,
            CreatedAt = enrollment.CreatedAt,
            IsAccessGranted = (enrollment.Status == "ACTIVE" || enrollment.Status == "COMPLETED") &&
                (!enrollment.ExpiresAt.HasValue || enrollment.ExpiresAt.Value > DateTime.UtcNow)
        };
    }
}
