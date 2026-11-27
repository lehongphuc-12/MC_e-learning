using MC_BE.Core.Entities;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

public sealed class CourseReviewAdminService(SmartMcDbContext context) : ICourseReviewAdminService
{
    public async Task<AdminCourseReviewPageDto<AdminCourseReviewDto>> GetReviewsAsync(
        int page, int pageSize, int? courseId, string? status, string? search)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = context.CourseReviews.AsNoTracking()
            .Include(review => review.Course)
            .Include(review => review.Learner)
            .Where(review => !courseId.HasValue || review.CourseId == courseId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(review => review.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(review => review.Course.Title.ToLower().Contains(term)
                || review.Learner.FullName.ToLower().Contains(term)
                || review.Learner.Email.ToLower().Contains(term)
                || (review.Comment != null && review.Comment.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(review => review.CreatedAt)
            .ThenByDescending(review => review.ReviewId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(review => new AdminCourseReviewDto
            {
                ReviewId = review.ReviewId,
                CourseId = review.CourseId,
                CourseTitle = review.Course.Title,
                LearnerId = review.LearnerId,
                LearnerName = review.Learner.FullName,
                LearnerEmail = review.Learner.Email,
                IsAnonymous = review.IsAnonymous,
                Rating = review.Rating,
                Comment = review.Comment,
                Status = review.Status,
                ModerationReason = review.ModerationReason,
                CreatedAt = review.CreatedAt,
                UpdatedAt = review.UpdatedAt,
                IsLearnerBlocked = context.CourseReviewRestrictions.Any(restriction =>
                    restriction.CourseId == review.CourseId && restriction.LearnerId == review.LearnerId && restriction.IsActive)
            }).ToListAsync();

        return Page(items, page, pageSize, total);
    }

    public async Task<AdminCourseReviewPageDto<AdminCourseReviewReportDto>> GetReportsAsync(
        int page, int pageSize, int? courseId, string? status)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = context.CourseReviewReports.AsNoTracking()
            .Include(report => report.Review).ThenInclude(review => review.Course)
            .Include(report => report.Review).ThenInclude(review => review.Learner)
            .Include(report => report.ReporterLearner)
            .Where(report => !courseId.HasValue || report.Review.CourseId == courseId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(report => report.Status == status);

        var total = await query.CountAsync();
        var items = await query.OrderBy(report => report.Status == "PENDING" ? 0 : report.Status == "UNDER_REVIEW" ? 1 : 2)
            .ThenByDescending(report => report.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(report => new AdminCourseReviewReportDto
            {
                ReportId = report.ReportId,
                ReviewId = report.ReviewId,
                CourseId = report.Review.CourseId,
                CourseTitle = report.Review.Course.Title,
                ReviewAuthorId = report.Review.LearnerId,
                ReviewAuthorName = report.Review.Learner.FullName,
                ReviewAuthorEmail = report.Review.Learner.Email,
                ReviewAuthorChoseAnonymous = report.Review.IsAnonymous,
                Rating = report.Review.Rating,
                ReviewComment = report.Review.Comment,
                ReviewStatus = report.Review.Status,
                Category = report.Category,
                Details = report.Details,
                Status = report.Status,
                ReporterId = report.ReporterLearnerId,
                ReporterName = report.ReporterLearner.FullName,
                ReporterEmail = report.ReporterLearner.Email,
                CreatedAt = report.CreatedAt,
                ReviewedAt = report.ReviewedAt,
                ResolutionNote = report.ResolutionNote
            }).ToListAsync();

        return Page(items, page, pageSize, total);
    }

    public async Task<AdminCourseReviewPageDto<AdminCourseReviewActionDto>> GetActionsAsync(
        int page, int pageSize, int? courseId, int? reviewId)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = context.CourseReviewModerationActions.AsNoTracking()
            .Include(action => action.Course)
            .Include(action => action.Admin)
            .Include(action => action.TargetLearner)
            .Where(action => !courseId.HasValue || action.CourseId == courseId.Value)
            .Where(action => !reviewId.HasValue || action.ReviewId == reviewId.Value);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(action => action.CreatedAt)
            .ThenByDescending(action => action.ActionId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(action => new AdminCourseReviewActionDto
            {
                ActionId = action.ActionId,
                CourseId = action.CourseId,
                CourseTitle = action.Course.Title,
                ReviewId = action.ReviewId,
                ReportId = action.ReportId,
                TargetLearnerId = action.TargetLearnerId,
                TargetLearnerName = action.TargetLearner == null ? null : action.TargetLearner.FullName,
                AdminName = action.Admin.FullName,
                ActionType = action.ActionType,
                Reason = action.Reason,
                CreatedAt = action.CreatedAt
            }).ToListAsync();
        return Page(items, page, pageSize, total);
    }

    public async Task<bool> ResolveReportAsync(int adminId, int reportId, ResolveCourseReviewReportRequest request)
    {
        var report = await context.CourseReviewReports
            .Include(item => item.Review)
            .FirstOrDefaultAsync(item => item.ReportId == reportId);
        if (report == null) return false;
        if (report.Status is "DISMISSED" or "ACTION_TAKEN")
            throw new InvalidOperationException("Báo cáo này đã được xử lý.");

        var now = DateTime.UtcNow;
        if (request.Decision == "DISMISS")
        {
            if (request.BlockAuthorForCourse || !string.IsNullOrWhiteSpace(request.ReviewAction))
                throw new InvalidOperationException("Báo cáo bị bỏ qua thì không thể kèm hành động với đánh giá hoặc người viết.");
            report.Status = "DISMISSED";
            report.ResolutionNote = request.Reason.Trim();
            AddAction(report.Review.CourseId, report.ReviewId, report.ReportId, report.Review.LearnerId, adminId, "REPORT_DISMISSED", request.Reason, now);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.ReviewAction) && !request.BlockAuthorForCourse)
                throw new InvalidOperationException("Hãy chọn xử lý đánh giá, chặn quyền đánh giá hoặc thực hiện cả hai.");
            if (!string.IsNullOrWhiteSpace(request.ReviewAction))
                ApplyReviewAction(report.Review, adminId, request.ReviewAction, request.Reason, now, report.ReportId);
            if (request.BlockAuthorForCourse)
                await ApplyBlockAsync(adminId, report.Review.CourseId, report.Review.LearnerId, report.ReviewId, request.Reason, now);
            report.Status = "ACTION_TAKEN";
            report.ResolutionNote = request.Reason.Trim();
        }

        report.ReviewedAt = now;
        report.ReviewedByAdminId = adminId;
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> StartReportReviewAsync(int adminId, int reportId)
    {
        var report = await context.CourseReviewReports.Include(item => item.Review)
            .FirstOrDefaultAsync(item => item.ReportId == reportId);
        if (report == null) return false;
        if (report.Status != "PENDING")
            throw new InvalidOperationException("Chỉ có thể nhận xử lý báo cáo đang chờ.");

        report.Status = "UNDER_REVIEW";
        AddAction(report.Review.CourseId, report.ReviewId, report.ReportId, report.Review.LearnerId,
            adminId, "REPORT_REVIEWING", "Admin bắt đầu xem xét báo cáo.", DateTime.UtcNow);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ModerateReviewAsync(int adminId, int reviewId, ModerateCourseReviewRequest request)
    {
        var review = await context.CourseReviews.FirstOrDefaultAsync(item => item.ReviewId == reviewId);
        if (review == null) return false;
        ApplyReviewAction(review, adminId, request.Action, request.Reason, DateTime.UtcNow, null);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> BlockReviewerAsync(int adminId, int courseId, int learnerId, BlockCourseReviewerRequest request)
    {
        if (!await context.CourseReviews.AnyAsync(review => review.CourseId == courseId && review.LearnerId == learnerId))
            throw new InvalidOperationException("Không tìm thấy học viên đã đánh giá khóa học này.");
        await ApplyBlockAsync(adminId, courseId, learnerId, request.TriggerReviewId, request.Reason, DateTime.UtcNow);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UnblockReviewerAsync(int adminId, int courseId, int learnerId, UnblockCourseReviewerRequest request)
    {
        var restriction = await context.CourseReviewRestrictions
            .FirstOrDefaultAsync(item => item.CourseId == courseId && item.LearnerId == learnerId && item.IsActive);
        if (restriction == null) return false;
        var now = DateTime.UtcNow;
        restriction.IsActive = false;
        restriction.LiftedAt = now;
        restriction.LiftedByAdminId = adminId;
        restriction.LiftReason = request.Reason.Trim();
        AddAction(courseId, restriction.TriggerReviewId, null, learnerId, adminId, "LEARNER_UNBLOCKED", request.Reason, now);
        await context.SaveChangesAsync();
        return true;
    }

    private void ApplyReviewAction(CourseReview review, int adminId, string action, string reason, DateTime now, int? reportId)
    {
        if (review.Status == "DELETED_BY_AUTHOR" && action != "REMOVE")
            throw new InvalidOperationException("Đánh giá đã bị học viên xóa và không thể khôi phục.");
        switch (action)
        {
            case "HIDE":
                review.Status = "HIDDEN_BY_ADMIN";
                break;
            case "REMOVE":
                review.Status = "REMOVED_BY_ADMIN";
                break;
            case "RESTORE":
                if (review.Status is not ("HIDDEN_BY_ADMIN" or "REMOVED_BY_ADMIN"))
                    throw new InvalidOperationException("Chỉ có thể khôi phục đánh giá đã bị Admin ẩn hoặc gỡ.");
                review.Status = "PUBLISHED";
                break;
            default:
                throw new InvalidOperationException("Thao tác kiểm duyệt không hợp lệ.");
        }

        review.ModeratedAt = now;
        review.ModeratedByAdminId = adminId;
        review.ModerationReason = action == "RESTORE" ? null : reason.Trim();
        review.UpdatedAt = now;
        var actionType = action switch
        {
            "HIDE" => "REVIEW_HIDDEN",
            "REMOVE" => "REVIEW_REMOVED",
            _ => "REVIEW_RESTORED"
        };
        AddAction(review.CourseId, review.ReviewId, reportId, review.LearnerId, adminId, actionType, reason, now);
    }

    private async Task ApplyBlockAsync(int adminId, int courseId, int learnerId, int? triggerReviewId, string reason, DateTime now)
    {
        if (triggerReviewId.HasValue && !await context.CourseReviews.AnyAsync(review =>
                review.ReviewId == triggerReviewId.Value && review.CourseId == courseId && review.LearnerId == learnerId))
            throw new InvalidOperationException("Đánh giá làm căn cứ chặn không thuộc học viên hoặc khóa học đã chọn.");

        var restriction = await context.CourseReviewRestrictions
            .FirstOrDefaultAsync(item => item.CourseId == courseId && item.LearnerId == learnerId);
        if (restriction?.IsActive == true)
            return;
        if (restriction == null)
        {
            restriction = new CourseReviewRestriction
            {
                CourseId = courseId,
                LearnerId = learnerId,
                CreatedByAdminId = adminId,
                TriggerReviewId = triggerReviewId,
                Reason = reason.Trim(),
                IsActive = true,
                CreatedAt = now
            };
            await context.CourseReviewRestrictions.AddAsync(restriction);
        }
        else
        {
            restriction.CreatedByAdminId = adminId;
            restriction.TriggerReviewId = triggerReviewId;
            restriction.Reason = reason.Trim();
            restriction.IsActive = true;
            restriction.CreatedAt = now;
            restriction.LiftedAt = null;
            restriction.LiftedByAdminId = null;
            restriction.LiftReason = null;
        }
        AddAction(courseId, triggerReviewId, null, learnerId, adminId, "LEARNER_BLOCKED", reason, now);
    }

    private void AddAction(int courseId, int? reviewId, int? reportId, int? learnerId, int adminId, string actionType, string reason, DateTime now)
        => context.CourseReviewModerationActions.Add(new CourseReviewModerationAction
        {
            CourseId = courseId,
            ReviewId = reviewId,
            ReportId = reportId,
            TargetLearnerId = learnerId,
            AdminId = adminId,
            ActionType = actionType,
            Reason = reason.Trim(),
            CreatedAt = now
        });

    private static AdminCourseReviewPageDto<T> Page<T>(List<T> items, int page, int pageSize, int total) => new()
    {
        Items = items,
        Page = page,
        PageSize = pageSize,
        Total = total,
        TotalPages = (int)Math.Ceiling(total / (double)pageSize)
    };
}
