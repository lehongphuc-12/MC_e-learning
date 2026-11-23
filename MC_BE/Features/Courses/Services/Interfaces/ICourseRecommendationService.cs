using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Features.Courses.Services.Interfaces;

public interface ICourseRecommendationService
{
    Task<CourseRecommendationResponse> GetRecommendationsAsync(int userId, int limit = 10);
    Task<List<CourseRecommendationDto>> GetTopRecommendationsAsync(int userId, int top = 3);
}
