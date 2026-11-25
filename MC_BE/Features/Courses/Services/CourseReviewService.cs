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
    private readonly IUnitOfWork _unitOfWork;

    public CourseReviewService(
        IGenericRepository<CourseReview> reviewRepository,
        IGenericRepository<Certificate> certificateRepository,
        IGenericRepository<Course> courseRepository,
        IUnitOfWork unitOfWork)
    {
        _reviewRepository = reviewRepository;
        _certificateRepository = certificateRepository;
        _courseRepository = courseRepository;
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

        return MapEligibility(review, certificateExists);
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

        var review = await _reviewRepository.GetQueryable()
            .FirstOrDefaultAsync(item => item.CourseId == courseId && item.LearnerId == learnerId);
        var now = DateTime.UtcNow;
        var comment = string.IsNullOrWhiteSpace(request.Comment) ? null : request.Comment.Trim();

        if (review == null)
        {
            review = new CourseReview
            {
                CourseId = courseId,
                LearnerId = learnerId,
                CertificateId = certificate.CertificateId,
                Rating = request.Rating,
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
            review.Comment = comment;
            review.Status = PublishedStatus;
            review.UpdatedAt = now;
            _reviewRepository.Update(review);
        }

        await _unitOfWork.SaveChangesAsync();
        return MapEligibility(review, true);
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
                Author = "Học viên đã hoàn thành khóa học",
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

    private static CourseReviewEligibilityDto MapEligibility(CourseReview? review, bool canReview) => new()
    {
        CanReview = canReview,
        HasReviewed = review != null,
        Rating = review?.Rating,
        Comment = review?.Comment,
        UpdatedAt = review?.UpdatedAt
    };
}
