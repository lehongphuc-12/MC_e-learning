using MC_BE.Features.Learning.DTOs;

namespace MC_BE.Features.Learning.Services.Interfaces;

public interface ICertificateService
{
    Task<List<CertificateDto>> GetMyCertificatesAsync(int learnerId);
    Task<CertificateDto?> GetCertificateByCourseAsync(int learnerId, int courseId);
    Task<CertificateDto?> GetCertificateByIdAsync(int certificateId, int? currentUserId = null);
    Task<CertificateDto?> IssueCertificateAsync(int learnerId, int courseId);
    Task<CertificateVerificationDto?> VerifyCertificateAsync(string code);
}
