using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

public sealed class CourseReviewService : ICourseReviewService
{
    private const string PublishedStatus = "PUBLISHED";
    private readonly IGenericRepository<CourseReview> _reviewRepository;
    private readonly IGenericRepository<Certificate> _certificateRepository;
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<CourseReviewReport> _reportRepository;
    private readonly IGenericRepository<CourseReviewRestriction> _restrictionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CourseReviewService(
        IGenericRepository<CourseReview> reviewRepository,
        IGenericRepository<Certificate> certificateRepository,
        IGenericRepository<Course> courseRepository,
        IGenericRepository<CourseReviewReport> reportRepository,
        IGenericRepository<CourseReviewRestriction> restrictionRepository,
        IUnitOfWork unitOfWork)
    {
        _reviewRepository = reviewRepository;
        _certificateRepository = certificateRepository;
        _courseRepository = courseRepository;
        _reportRepository = reportRepository;
        _restrictionRepository = restrictionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<CourseReviewListDto?> GetPublishedReviewsAsync(int courseId, int page, int pageSize)
    {
        var courseExists = await _courseRepository.AnyAsync(course =>
            course.CourseId == courseId && course.Status == CourseStatus.PUBLISHED);
        if (!courseExists) return null;
        return await BuildListAsync(courseId, page, pageSize);
    }

    public async Task<CourseReviewEligibilityDto?> GetLearnerReviewAsync(int learnerId, int courseId)
    {
        if (!await _courseRepository.AnyAsync(course => course.CourseId == courseId)) return null;

        var review = await _reviewRepository.GetQueryable()
            .FirstOrDefaultAsync(item => item.CourseId == courseId && item.LearnerId == learnerId);
        var certificateExists = await _certificateRepository.GetQueryable()
            .AnyAsync(certificate => certificate.Status == "ACTIVE"
                && certificate.Enrollment.LearnerId == learnerId
                && certificate.Enrollment.CourseId == courseId);
        var restriction = await _restrictionRepository.GetQueryable()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.CourseId == courseId && item.LearnerId == learnerId && item.IsActive);

        return MapEligibility(review, certificateExists && restriction == null, restriction?.Reason);
    }

    public async Task<CourseReviewEligibilityDto?> SubmitOrUpdateLearnerReviewAsync(
        int learnerId,
        int courseId,
        SubmitCourseReviewRequest request)
    {
        if (!await _courseRepository.AnyAsync(course => course.CourseId == courseId)) return null;

        var certificate = await _certificateRepository.GetQueryable()
            .Where(item => item.Status == "ACTIVE"
                && item.Enrollment.LearnerId == learnerId
                && item.Enrollment.CourseId == courseId)
            .OrderByDescending(item => item.IssuedAt)
            .FirstOrDefaultAsync();

        if (certificate == null)
            throw new InvalidOperationException("Bạn chỉ có thể đánh giá sau khi hoàn thành khóa học và được cấp chứng chỉ.");

        var restriction = await _restrictionRepository.GetQueryable()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.CourseId == courseId && item.LearnerId == learnerId && item.IsActive);
        if (restriction != null)
            throw new InvalidOperationException($"Bạn đang bị hạn chế đánh giá khóa học này. Lý do: {restriction.Reason}");

        var review = await _reviewRepository.GetQueryable()
            .FirstOrDefaultAsync(item => item.CourseId == courseId && item.LearnerId == learnerId);
        var now = DateTime.UtcNow;
        var comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();

        if (review != null && review.Status is "HIDDEN_BY_ADMIN" or "REMOVED_BY_ADMIN")
            throw new InvalidOperationException("Đánh giá này đang bị Admin ẩn hoặc gỡ. Vui lòng liên hệ hỗ trợ nếu bạn cho rằng có nhầm lẫn.");

        if (review == null)
        {
            review = new CourseReview
            {
                CourseId = courseId,
                LearnerId = learnerId,
                CertificateId = certificate.CertificateId,
                Rating = request.Rating,
                IsAnonymous = request.IsAnonymous,
                Comment = comment,
                Status = PublishedStatus,
                CreatedAt = now,
                UpdatedAt = now
            };
            await _reviewRepository.AddAsync(review);
        }
        else
        {
            review.CertificateId = certificate.CertificateId;
            review.Rating = request.Rating;
            review.IsAnonymous = request.IsAnonymous;
            review.Comment = comment;
            review.Status = PublishedStatus;
            review.ModerationReason = null;
            review.ModeratedAt = null;
            review.ModeratedByAdminId = null;
            review.DeletedAt = null;
            review.UpdatedAt = now;
            _reviewRepository.Update(review);
        }

        await _unitOfWork.SaveChangesAsync();
        return MapEligibility(review, true);
    }

    public async Task<bool> DeleteLearnerReviewAsync(int learnerId, int courseId)
    {
        var review = await _reviewRepository.GetQueryable()
            .FirstOrDefaultAsync(item => item.CourseId == courseId && item.LearnerId == learnerId);
        if (review == null) return false;
        if (review.Status == "DELETED_BY_AUTHOR") return true;

        review.Status = "DELETED_BY_AUTHOR";
        review.DeletedAt = DateTime.UtcNow;
        review.UpdatedAt = DateTime.UtcNow;
        _reviewRepository.Update(review);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<CourseReviewReportResultDto?> CreateReportAsync(
        int reporterLearnerId,
        int courseId,
        int reviewId,
        CreateCourseReviewReportRequest request)
    {
        var review = await _reviewRepository.GetQueryable()
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.ReviewId == reviewId && item.CourseId == courseId && item.Status == PublishedStatus);
        if (review == null) return null;
        if (review.LearnerId == reporterLearnerId)
            throw new InvalidOperationException("Bạn không thể báo cáo đánh giá của chính mình.");

        var existingReport = await _reportRepository.GetQueryable()
            .AsNoTracking()
            .AnyAsync(item => item.ReviewId == reviewId && item.ReporterLearnerId == reporterLearnerId);
        if (existingReport)
            throw new InvalidOperationException("Bạn đã gửi báo cáo cho đánh giá này rồi.");

        var report = new CourseReviewReport
        {
            ReviewId = reviewId,
            ReporterLearnerId = reporterLearnerId,
            Category = request.Category,
            Details = string.IsNullOrWhiteSpace(request.Details) ? null : request.Details.Trim(),
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow
        };
        await _reportRepository.AddAsync(report);
        await _unitOfWork.SaveChangesAsync();
        return new CourseReviewReportResultDto { ReportId = report.ReportId, Status = report.Status };
    }

    public async Task<CourseReviewListDto?> GetInstructorReviewsAsync(
        int instructorId,
        int courseId,
        int page,
        int pageSize)
    {
        var ownsCourse = await _courseRepository.AnyAsync(course =>
            course.CourseId == courseId && course.InstructorId == instructorId);
        if (!ownsCourse) return null;
        return await BuildListAsync(courseId, page, pageSize);
    }

    private async Task<CourseReviewListDto> BuildListAsync(int courseId, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var query = _reviewRepository.GetQueryable()
            .AsNoTracking()
            .Where(item => item.CourseId == courseId && item.Status == PublishedStatus);

        var reviewCount = await query.CountAsync();
        var averageRating = reviewCount == 0 ? 0 : await query.AverageAsync(item => (double)item.Rating);
        var reviews = await query
            .OrderByDescending(item => item.CreatedAt)
            .ThenByDescending(item => item.ReviewId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new CourseReviewItemDto
            {
                ReviewId = item.ReviewId,
                Author = item.IsAnonymous ? "Học viên ẩn danh" : item.Learner.FullName,
                Rating = item.Rating,
                Comment = item.Comment,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt
            })
            .ToListAsync();

        return new CourseReviewListDto
        {
            AverageRating = Math.Round(averageRating, 1),
            ReviewCount = reviewCount,
            Reviews = reviews,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(reviewCount / (double)pageSize)
        };
    }

    private static CourseReviewEligibilityDto MapEligibility(CourseReview? review, bool canReview, string? restrictionMessage = null)
    {
        var authorDeleted = review?.Status == "DELETED_BY_AUTHOR";
        var adminModerated = review?.Status is "HIDDEN_BY_ADMIN" or "REMOVED_BY_ADMIN";
        return new CourseReviewEligibilityDto
        {
            CanReview = canReview && !adminModerated,
            HasReviewed = review != null && !authorDeleted,
            ReviewId = authorDeleted ? null : review?.ReviewId,
            Rating = authorDeleted ? null : review?.Rating,
            Comment = authorDeleted ? null : review?.Comment,
            IsAnonymous = authorDeleted || review == null || review.IsAnonymous,
            HasActiveRestriction = restrictionMessage != null,
            RestrictionMessage = restrictionMessage ?? (adminModerated ? "Đánh giá của bạn đang được Admin hạn chế hiển thị." : null),
            UpdatedAt = authorDeleted ? null : review?.UpdatedAt
        };
    }
}
