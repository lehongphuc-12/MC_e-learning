using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.DTOs;

namespace MC_BE.Services.Interfaces;

public interface IEnrollmentService
{
    Task<ApiResponse<EnrollmentDto>> EnrollCourseAsync(int learnerId, int courseId);
    Task<ApiResponse<List<EnrollmentDto>>> GetMyEnrollmentsAsync(int learnerId);
    Task<bool> HasActiveAccessAsync(int learnerId, int courseId);
    Task<ApiResponse<bool>> CancelPendingEnrollmentAsync(int learnerId, int enrollmentId);
    Task<ApiResponse<bool>> RevokeEnrollmentByAdminAsync(int enrollmentId, RevokeEnrollmentRequest request);
}