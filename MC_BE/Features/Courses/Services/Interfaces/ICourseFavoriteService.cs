namespace MC_BE.Features.Courses.Services.Interfaces;

public interface ICourseFavoriteService
{
    Task<List<int>> GetFavoriteCourseIdsAsync(int learnerId);
    Task AddFavoriteAsync(int learnerId, int courseId);
    Task RemoveFavoriteAsync(int learnerId, int courseId);
}
