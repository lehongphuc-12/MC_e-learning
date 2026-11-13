using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

/// <summary>
/// Keeps promotion grants separate from course pricing and learning progress.
/// A course can therefore be sold normally and also be granted as a purchase benefit.
/// </summary>
public sealed class CourseGiftAccessService : ICourseGiftAccessService
{
    private const string Active = "ACTIVE";
    private const string GiftSource = "GIFT";
    private const string DirectPurchaseSource = "DIRECT_PURCHASE";
    private readonly SmartMcDbContext _db;

    public CourseGiftAccessService(SmartMcDbContext db) => _db = db;

    public async Task<CourseGiftPolicyDto> GetPolicyAsync(CancellationToken cancellationToken = default)
    {
        var policy = await _db.CourseGiftPolicies.AsNoTracking()
            .Include(x => x.GiftCourse)
            .OrderBy(x => x.PolicyId)
            .FirstOrDefaultAsync(cancellationToken);
        return new CourseGiftPolicyDto
        {
            GiftCourseId = policy?.GiftCourseId,
            GiftCourseTitle = policy?.GiftCourse.Title,
            IsActive = policy?.IsActive ?? false
        };
    }

    public async Task<CourseGiftCandidatesPageDto> GetCandidatesAsync(int page = 1, int pageSize = 100, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = _db.Courses.AsNoTracking()
            .Where(c => c.Status == CourseStatus.PUBLISHED && !c.IsFree && c.Price > 0);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(c => c.Title)
            .ThenBy(c => c.CourseId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CourseGiftCandidateDto
            {
                CourseId = c.CourseId,
                Title = c.Title,
                Price = c.Price,
                InstructorName = c.Instructor.FullName
            })
            .ToListAsync(cancellationToken);
        return new CourseGiftCandidatesPageDto { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    public async Task<CourseGiftPolicyDto> UpdatePolicyAsync(
        UpdateCourseGiftPolicyRequest request, int adminId, CancellationToken cancellationToken = default)
    {
        if (request.IsActive && !request.GiftCourseId.HasValue)
            throw new InvalidOperationException("Hãy chọn khóa AI trước khi bật ưu đãi.");

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        var policy = await _db.CourseGiftPolicies.OrderBy(x => x.PolicyId).FirstOrDefaultAsync(cancellationToken);

        if (request.GiftCourseId.HasValue)
        {
            var target = await _db.Courses.FirstOrDefaultAsync(c => c.CourseId == request.GiftCourseId.Value, cancellationToken);
            if (target is null)
                throw new KeyNotFoundException("Không tìm thấy khóa học được chọn làm khóa AI tặng kèm.");
            if (request.IsActive && (target.Status != CourseStatus.PUBLISHED || target.IsFree || target.Price <= 0))
                throw new InvalidOperationException("Khóa AI phải được Admin xuất bản và có giá bán lớn hơn 0 để vừa bán riêng vừa tặng kèm.");

            policy ??= new CourseGiftPolicy { PolicyId = 1, GiftCourseId = target.CourseId };
            policy.GiftCourseId = target.CourseId;
        }
        else if (policy is null)
        {
            return new CourseGiftPolicyDto { IsActive = false };
        }

        policy!.IsActive = request.IsActive;
        policy.UpdatedByAdminId = adminId;
        policy.UpdatedAt = DateTime.UtcNow;
        if (_db.Entry(policy).State == EntityState.Detached)
            _db.CourseGiftPolicies.Add(policy);

        // Preserve existing learners when an admin first activates or changes the gift course.
        // Old entitlements are recorded explicitly so subsequent revocation follows the new rules.
        if (request.IsActive && request.GiftCourseId.HasValue)
        {
            var activeLegacyEnrollments = await _db.Enrollments
                .Where(e => e.CourseId == request.GiftCourseId.Value &&
                    (e.Status == "ACTIVE" || e.Status == "COMPLETED") &&
                    (!e.ExpiresAt.HasValue || e.ExpiresAt.Value > DateTime.UtcNow) &&
                    !_db.CourseAccessGrants.Any(g => g.CourseId == e.CourseId && g.LearnerId == e.LearnerId))
                .ToListAsync(cancellationToken);

            foreach (var enrollment in activeLegacyEnrollments)
            {
                _db.CourseAccessGrants.Add(new CourseAccessGrant
                {
                    LearnerId = enrollment.LearnerId,
                    CourseId = enrollment.CourseId,
                    SourceType = "LEGACY",
                    SourceEnrollmentId = enrollment.EnrollmentId,
                    Status = Active,
                    GrantedAt = enrollment.EnrolledAt ?? enrollment.CreatedAt,
                    ExpiresAt = enrollment.ExpiresAt
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await GetPolicyAsync(cancellationToken);
    }

    public async Task IssuePaymentGrantsAsync(IEnumerable<PaymentItem> paymentItems, DateTime grantedAt, CancellationToken cancellationToken = default)
    {
        var policy = await _db.CourseGiftPolicies.AsNoTracking()
            .OrderBy(x => x.PolicyId)
            .FirstOrDefaultAsync(cancellationToken);
        if (policy is null) return;

        foreach (var item in paymentItems)
        {
            var paidCourseExists = await _db.Courses.AsNoTracking()
                .AnyAsync(c => c.CourseId == item.CourseId, cancellationToken);
            // The payment item is the purchase-time snapshot; current course pricing may have changed after checkout.
            if (!paidCourseExists || item.Amount <= 0) continue;

            var isDirectGiftCoursePurchase = item.CourseId == policy.GiftCourseId;
            if (!isDirectGiftCoursePurchase && !policy.IsActive) continue;
            var targetCourseId = isDirectGiftCoursePurchase ? item.CourseId : policy.GiftCourseId;
            var sourceType = isDirectGiftCoursePurchase ? DirectPurchaseSource : GiftSource;

            var exists = await _db.CourseAccessGrants.AnyAsync(g =>
                g.SourcePaymentItemId == item.PaymentItemId &&
                g.CourseId == targetCourseId &&
                g.SourceType == sourceType, cancellationToken);
            if (exists) continue;

            var sourceEnrollment = item.Enrollment ?? await _db.Enrollments
                .FirstOrDefaultAsync(e => e.EnrollmentId == item.EnrollmentId, cancellationToken);
            if (sourceEnrollment is null) continue;

            _db.CourseAccessGrants.Add(new CourseAccessGrant
            {
                LearnerId = sourceEnrollment.LearnerId,
                CourseId = targetCourseId,
                SourceType = sourceType,
                SourcePaymentItemId = item.PaymentItemId,
                SourceEnrollmentId = sourceEnrollment.EnrollmentId,
                Status = Active,
                GrantedAt = grantedAt,
                ExpiresAt = sourceEnrollment.ExpiresAt
            });

            if (!isDirectGiftCoursePurchase)
                await EnsureLearningEnrollmentAsync(sourceEnrollment.LearnerId, targetCourseId, sourceEnrollment.ExpiresAt, grantedAt, cancellationToken);
        }
    }

    public async Task RevokeGiftGrantsForCompletedEnrollmentAsync(int enrollmentId, DateTime revokedAt, CancellationToken cancellationToken = default)
    {
        var grants = await _db.CourseAccessGrants
            .Where(g => g.SourceEnrollmentId == enrollmentId && g.SourceType == GiftSource && g.Status == Active)
            .ToListAsync(cancellationToken);
        foreach (var grant in grants)
        {
            grant.Status = "REVOKED";
            grant.RevokedAt = revokedAt;
            grant.RevocationReason = "SOURCE_COURSE_CERTIFICATE_ISSUED";
        }
    }

    public Task<bool> HasActiveGrantAsync(int courseId, int learnerId, DateTime utcNow, CancellationToken cancellationToken = default) =>
        _db.CourseAccessGrants.AsNoTracking().AnyAsync(g => g.CourseId == courseId && g.LearnerId == learnerId &&
            g.Status == Active && (!g.ExpiresAt.HasValue || g.ExpiresAt.Value > utcNow), cancellationToken);

    public async Task<bool> IsGiftManagedCourseAsync(int courseId, CancellationToken cancellationToken = default) =>
        await _db.CourseGiftPolicies.AnyAsync(p => p.GiftCourseId == courseId, cancellationToken) ||
        await _db.CourseAccessGrants.AnyAsync(g => g.CourseId == courseId, cancellationToken);

    public Task<bool> IsGiftCourseAsync(int courseId, CancellationToken cancellationToken = default) =>
        _db.CourseGiftPolicies.AnyAsync(p => p.GiftCourseId == courseId, cancellationToken);

    public async Task<bool> IsGiftOnlyAccessAsync(int courseId, int learnerId, DateTime utcNow, CancellationToken cancellationToken = default)
    {
        var hasGift = await _db.CourseAccessGrants.AnyAsync(g => g.CourseId == courseId && g.LearnerId == learnerId &&
            g.SourceType == GiftSource && g.Status == Active && (!g.ExpiresAt.HasValue || g.ExpiresAt.Value > utcNow), cancellationToken);
        if (!hasGift) return false;
        return !await _db.CourseAccessGrants.AnyAsync(g => g.CourseId == courseId && g.LearnerId == learnerId &&
            g.SourceType == DirectPurchaseSource && g.Status == Active && (!g.ExpiresAt.HasValue || g.ExpiresAt.Value > utcNow), cancellationToken);
    }

    public async Task<Dictionary<int, bool>> GetManagedCourseAccessAsync(
        int learnerId, IReadOnlyCollection<int> courseIds, DateTime utcNow, CancellationToken cancellationToken = default)
    {
        var ids = courseIds.Distinct().ToArray();
        if (ids.Length == 0) return new Dictionary<int, bool>();

        var managedIds = await _db.CourseGiftPolicies.AsNoTracking()
            .Where(p => ids.Contains(p.GiftCourseId))
            .Select(p => p.GiftCourseId)
            .Union(_db.CourseAccessGrants.AsNoTracking()
                .Where(g => ids.Contains(g.CourseId))
                .Select(g => g.CourseId))
            .Distinct()
            .ToListAsync(cancellationToken);
        var activeIds = await _db.CourseAccessGrants.AsNoTracking()
            .Where(g => ids.Contains(g.CourseId) && g.LearnerId == learnerId && g.Status == Active &&
                (!g.ExpiresAt.HasValue || g.ExpiresAt.Value > utcNow))
            .Select(g => g.CourseId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var activeSet = activeIds.ToHashSet();
        return managedIds.ToDictionary(courseId => courseId, activeSet.Contains);
    }

    private async Task EnsureLearningEnrollmentAsync(int learnerId, int courseId, DateTime? expiresAt, DateTime now, CancellationToken cancellationToken)
    {
        var enrollment = await _db.Enrollments
            .Where(e => e.LearnerId == learnerId && e.CourseId == courseId)
            .OrderByDescending(e => e.EnrollmentId)
            .FirstOrDefaultAsync(cancellationToken);
        if (enrollment is null)
        {
            _db.Enrollments.Add(new Enrollment
            {
                LearnerId = learnerId, CourseId = courseId, Status = Active,
                EnrolledAt = now, ExpiresAt = expiresAt, CreatedAt = now, UpdatedAt = now
            });
            return;
        }

        if (enrollment.Status != "ACTIVE" && enrollment.Status != "PENDING_PAYMENT" && enrollment.Status != "COMPLETED")
            enrollment.Status = Active;
        enrollment.EnrolledAt ??= now;
        if (!expiresAt.HasValue || !enrollment.ExpiresAt.HasValue || expiresAt.Value > enrollment.ExpiresAt.Value)
            enrollment.ExpiresAt = expiresAt;
        enrollment.UpdatedAt = now;
    }
}
