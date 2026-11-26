using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

public interface ICourseReviewAdminService
{
    Task<AdminCourseReviewPageDto<AdminCourseReviewDto>> GetReviewsAsync(int page, int pageSize, int? courseId, string? status, string? search);
    Task<AdminCourseReviewPageDto<AdminCourseReviewReportDto>> GetReportsAsync(int page, int pageSize, int? courseId, string? status);
    Task<AdminCourseReviewPageDto<AdminCourseReviewActionDto>> GetActionsAsync(int page, int pageSize, int? courseId, int? reviewId);
    Task<bool> ResolveReportAsync(int adminId, int reportId, ResolveCourseReviewReportRequest request);
    Task<bool> StartReportReviewAsync(int adminId, int reportId);
    Task<bool> ModerateReviewAsync(int adminId, int reviewId, ModerateCourseReviewRequest request);
    Task<bool> BlockReviewerAsync(int adminId, int courseId, int learnerId, BlockCourseReviewerRequest request);
    Task<bool> UnblockReviewerAsync(int adminId, int courseId, int learnerId, UnblockCourseReviewerRequest request);
}
