using MC_BE.Features.Enrollment.DTO;

namespace MC_BE.Features.Enrollment.Services;

public interface ICourseAccessExtensionService
{
    Task<EnrollmentAccessExtensionDto> CreateAsync(int learnerId, int enrollmentId, CreateAccessExtensionRequest request, CancellationToken cancellationToken = default);
    Task<List<EnrollmentAccessExtensionDto>> GetMineAsync(int learnerId, CancellationToken cancellationToken = default);
    Task<List<EnrollmentAccessExtensionDto>> GetPendingAsync(CancellationToken cancellationToken = default);
    Task<EnrollmentAccessExtensionDto> DecideAsync(long requestId, int adminId, bool approve, DecideAccessExtensionRequest request, CancellationToken cancellationToken = default);
}
