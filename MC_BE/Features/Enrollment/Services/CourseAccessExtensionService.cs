using MC_BE.Core.Entities;
using MC_BE.Features.Enrollment.DTO;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Enrollment.Services;

public sealed class CourseAccessExtensionService(SmartMcDbContext db) : ICourseAccessExtensionService
{
    private static readonly TimeSpan RequestWindow = TimeSpan.FromDays(14);
    private static readonly TimeSpan ExpiredRequestGrace = TimeSpan.FromDays(30);

    public async Task<EnrollmentAccessExtensionDto> CreateAsync(int learnerId, int enrollmentId, CreateAccessExtensionRequest request, CancellationToken cancellationToken = default)
    {
        var enrollment = await db.Enrollments.Include(x => x.Course)
            .FirstOrDefaultAsync(x => x.EnrollmentId == enrollmentId && x.LearnerId == learnerId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy ghi danh khóa học.");
        var now = DateTime.UtcNow;
        if (enrollment.Status is not ("ACTIVE" or "COMPLETED" or "EXPIRED"))
            throw new InvalidOperationException("Ghi danh này chưa được kích hoạt hoặc đã bị thu hồi.");
        if (!enrollment.ExpiresAt.HasValue)
            throw new InvalidOperationException("Khóa học này không có ngày hết hạn nên không cần gửi yêu cầu gia hạn.");
        if (enrollment.ExpiresAt.Value > now.Add(RequestWindow))
            throw new InvalidOperationException("Bạn có thể gửi yêu cầu gia hạn trong vòng 14 ngày trước khi hết hạn.");
        if (enrollment.ExpiresAt.Value < now.Subtract(ExpiredRequestGrace))
            throw new InvalidOperationException("Đã quá 30 ngày kể từ khi hết hạn. Vui lòng liên hệ bộ phận hỗ trợ.");

        long? grantId = null;
        var isManaged = await db.CourseGiftPolicies.AnyAsync(p => p.GiftCourseId == enrollment.CourseId, cancellationToken)
            || await db.CourseAccessGrants.AnyAsync(g => g.CourseId == enrollment.CourseId, cancellationToken);
        if (isManaged)
        {
            var grant = await db.CourseAccessGrants
                .Where(g => g.LearnerId == learnerId && g.CourseId == enrollment.CourseId && g.Status == "ACTIVE"
                    && g.ExpiresAt.HasValue && g.ExpiresAt.Value <= now.Add(RequestWindow)
                    && g.ExpiresAt.Value >= now.Subtract(ExpiredRequestGrace))
                .OrderByDescending(g => g.ExpiresAt).ThenByDescending(g => g.GrantedAt)
                .FirstOrDefaultAsync(cancellationToken);
            if (grant is null)
                throw new InvalidOperationException("Không tìm thấy quyền mua hoặc quà tặng còn đủ điều kiện để gia hạn.");
            grantId = grant.GrantId;
        }

        if (await db.EnrollmentAccessExtensionRequests.AnyAsync(x => x.EnrollmentId == enrollmentId && x.Status == "PENDING", cancellationToken))
            throw new InvalidOperationException("Bạn đã có yêu cầu gia hạn đang chờ xem xét.");

        var entity = new EnrollmentAccessExtensionRequest
        {
            EnrollmentId = enrollment.EnrollmentId,
            LearnerId = learnerId,
            CourseId = enrollment.CourseId,
            CourseAccessGrantId = grantId,
            Reason = request.Reason.Trim(),
            RequestedAt = now
        };
        db.EnrollmentAccessExtensionRequests.Add(entity);

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        var adminIds = await db.Users.AsNoTracking().Where(u => u.Role.RoleName.ToUpper() == "ADMIN").Select(u => u.UserId).ToListAsync(cancellationToken);
        foreach (var adminId in adminIds)
            db.Notifications.Add(new Notification { UserId = adminId, Type = "access_extension", Title = "Yêu cầu gia hạn quyền học", Message = $"Học viên #{learnerId} gửi yêu cầu gia hạn khóa '{enrollment.Course.Title}'.", Url = "/admin?tab=access-extensions", DedupKey = $"access-extension:request:{entity.RequestId}:admin:{adminId}" });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await GetDtoAsync(entity.RequestId, cancellationToken);
    }

    public Task<List<EnrollmentAccessExtensionDto>> GetMineAsync(int learnerId, CancellationToken cancellationToken = default) =>
        Query().Where(x => x.LearnerId == learnerId).OrderByDescending(x => x.RequestedAt).Select(ToDto()).ToListAsync(cancellationToken);

    public Task<List<EnrollmentAccessExtensionDto>> GetPendingAsync(CancellationToken cancellationToken = default) =>
        Query().Where(x => x.Status == "PENDING").OrderBy(x => x.RequestedAt).Select(ToDto()).ToListAsync(cancellationToken);

    public async Task<EnrollmentAccessExtensionDto> DecideAsync(long requestId, int adminId, bool approve, DecideAccessExtensionRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await db.EnrollmentAccessExtensionRequests.Include(x => x.Enrollment).Include(x => x.Course)
            .FirstOrDefaultAsync(x => x.RequestId == requestId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy yêu cầu gia hạn.");
        if (entity.Status != "PENDING") throw new InvalidOperationException("Yêu cầu này đã được xử lý.");

        var now = DateTime.UtcNow;
        if (approve)
        {
            if (entity.CourseAccessGrantId.HasValue)
            {
                var grant = await db.CourseAccessGrants.FirstOrDefaultAsync(x => x.GrantId == entity.CourseAccessGrantId && x.LearnerId == entity.LearnerId && x.CourseId == entity.CourseId && x.Status == "ACTIVE", cancellationToken)
                    ?? throw new InvalidOperationException("Quyền mua/quà tặng đã bị thu hồi nên không thể gia hạn.");
                var newExpiry = (grant.ExpiresAt.HasValue && grant.ExpiresAt.Value > now ? grant.ExpiresAt.Value : now).AddDays(request.GrantedDays);
                grant.ExpiresAt = newExpiry;
                if (grant.SourcePaymentItemId.HasValue)
                {
                    var aiEntitlement = await db.VoiceAiEntitlements.FirstOrDefaultAsync(x => x.SourcePaymentItemId == grant.SourcePaymentItemId, cancellationToken);
                    if (aiEntitlement is not null) aiEntitlement.ExpiresAt = newExpiry;
                }
                var latestGrantExpiry = await db.CourseAccessGrants
                    .Where(x => x.LearnerId == entity.LearnerId && x.CourseId == entity.CourseId && x.Status == "ACTIVE")
                    .Select(x => x.ExpiresAt).ToListAsync(cancellationToken);
                entity.Enrollment.ExpiresAt = latestGrantExpiry.Any(x => !x.HasValue)
                    ? null
                    : latestGrantExpiry.Where(x => x.HasValue).Select(x => x!.Value).DefaultIfEmpty(newExpiry).Max();
            }
            else
            {
                entity.Enrollment.ExpiresAt = (entity.Enrollment.ExpiresAt.HasValue && entity.Enrollment.ExpiresAt.Value > now
                    ? entity.Enrollment.ExpiresAt.Value : now).AddDays(request.GrantedDays);
            }
            if (entity.Enrollment.Status == "EXPIRED") entity.Enrollment.Status = "ACTIVE";
            entity.Enrollment.UpdatedAt = now;
            entity.Status = "APPROVED";
            entity.GrantedDays = request.GrantedDays;
        }
        else entity.Status = "REJECTED";

        entity.ReviewedAt = now;
        entity.ReviewedByAdminId = adminId;
        entity.DecisionNote = string.IsNullOrWhiteSpace(request.DecisionNote) ? null : request.DecisionNote.Trim();
        db.Notifications.Add(new Notification
        {
            UserId = entity.LearnerId,
            Type = "access_extension",
            Title = approve ? "Đã gia hạn quyền học" : "Yêu cầu gia hạn đã được xem xét",
            Message = approve ? $"Quyền truy cập '{entity.Course.Title}' đã được gia hạn thêm {request.GrantedDays} ngày." : $"Yêu cầu gia hạn '{entity.Course.Title}' chưa được chấp thuận.{(entity.DecisionNote is null ? string.Empty : $" Lý do: {entity.DecisionNote}")}",
            Url = "/my-courses",
            DedupKey = $"access-extension:decision:{entity.RequestId}"
        });
        await db.SaveChangesAsync(cancellationToken);
        return await GetDtoAsync(entity.RequestId, cancellationToken);
    }

    private IQueryable<EnrollmentAccessExtensionRequest> Query() => db.EnrollmentAccessExtensionRequests.AsNoTracking()
        .Include(x => x.Course).Include(x => x.Learner).Include(x => x.Enrollment).Include(x => x.ReviewedByAdmin);

    private async Task<EnrollmentAccessExtensionDto> GetDtoAsync(long requestId, CancellationToken cancellationToken) =>
        await Query().Where(x => x.RequestId == requestId).Select(ToDto()).FirstAsync(cancellationToken);

    private static System.Linq.Expressions.Expression<Func<EnrollmentAccessExtensionRequest, EnrollmentAccessExtensionDto>> ToDto() => x => new EnrollmentAccessExtensionDto
    {
        RequestId = x.RequestId, EnrollmentId = x.EnrollmentId, CourseId = x.CourseId, CourseTitle = x.Course.Title,
        LearnerId = x.LearnerId, LearnerName = x.Learner.FullName, LearnerEmail = x.Learner.Email,
        ExpiresAt = x.Enrollment.ExpiresAt, CourseAccessGrantId = x.CourseAccessGrantId, Reason = x.Reason,
        Status = x.Status, RequestedAt = x.RequestedAt, ReviewedAt = x.ReviewedAt,
        ReviewedByAdminName = x.ReviewedByAdmin == null ? null : x.ReviewedByAdmin.FullName,
        GrantedDays = x.GrantedDays, DecisionNote = x.DecisionNote
    };
}
