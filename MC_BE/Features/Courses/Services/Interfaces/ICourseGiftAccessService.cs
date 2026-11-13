using MC_BE.Core.Entities;
using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

public interface ICourseGiftAccessService
{
    Task<CourseGiftPolicyDto> GetPolicyAsync(CancellationToken cancellationToken = default);
    Task<CourseGiftCandidatesPageDto> GetCandidatesAsync(int page = 1, int pageSize = 100, CancellationToken cancellationToken = default);
    Task<CourseGiftPolicyDto> UpdatePolicyAsync(UpdateCourseGiftPolicyRequest request, int adminId, CancellationToken cancellationToken = default);
    Task IssuePaymentGrantsAsync(IEnumerable<PaymentItem> paymentItems, DateTime grantedAt, CancellationToken cancellationToken = default);
    Task RevokeGiftGrantsForCompletedEnrollmentAsync(int enrollmentId, DateTime revokedAt, CancellationToken cancellationToken = default);
    Task<bool> HasActiveGrantAsync(int courseId, int learnerId, DateTime utcNow, CancellationToken cancellationToken = default);
    Task<bool> IsGiftManagedCourseAsync(int courseId, CancellationToken cancellationToken = default);
    Task<bool> IsGiftCourseAsync(int courseId, CancellationToken cancellationToken = default);
    Task<bool> IsGiftOnlyAccessAsync(int courseId, int learnerId, DateTime utcNow, CancellationToken cancellationToken = default);
    Task<Dictionary<int, bool>> GetManagedCourseAccessAsync(int learnerId, IReadOnlyCollection<int> courseIds, DateTime utcNow, CancellationToken cancellationToken = default);
}
