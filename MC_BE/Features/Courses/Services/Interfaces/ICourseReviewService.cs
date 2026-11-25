using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

public interface ICourseReviewService
{
    Task<CourseReviewListDto?> GetPublishedReviewsAsync(int courseId, int page, int pageSize);
    Task<CourseReviewEligibilityDto?> GetLearnerReviewAsync(int learnerId, int courseId);
    Task<CourseReviewEligibilityDto?> SubmitOrUpdateLearnerReviewAsync(int learnerId, int courseId, SubmitCourseReviewRequest request);
    Task<CourseReviewListDto?> GetInstructorReviewsAsync(int instructorId, int courseId, int page, int pageSize);
}
