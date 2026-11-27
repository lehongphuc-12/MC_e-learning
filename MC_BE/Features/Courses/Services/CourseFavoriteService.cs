using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

public sealed class CourseFavoriteService : ICourseFavoriteService
{
    private readonly IGenericRepository<LearnerFavoriteCourse> _favorites;
    private readonly IGenericRepository<Course> _courses;
    private readonly IUnitOfWork _unitOfWork;

    public CourseFavoriteService(
        IGenericRepository<LearnerFavoriteCourse> favorites,
        IGenericRepository<Course> courses,
        IUnitOfWork unitOfWork)
    {
        _favorites = favorites;
        _courses = courses;
        _unitOfWork = unitOfWork;
    }

    public Task<List<int>> GetFavoriteCourseIdsAsync(int learnerId) => _favorites.GetQueryable()
        .AsNoTracking()
        .Where(favorite => favorite.LearnerId == learnerId && favorite.Course.Status == CourseStatus.PUBLISHED)
        .OrderByDescending(favorite => favorite.CreatedAt)
        .Select(favorite => favorite.CourseId)
        .ToListAsync();

    public async Task AddFavoriteAsync(int learnerId, int courseId)
    {
        var isPublished = await _courses.GetQueryable().AsNoTracking()
            .AnyAsync(course => course.CourseId == courseId && course.Status == CourseStatus.PUBLISHED);
        if (!isPublished) throw new KeyNotFoundException("Không tìm thấy khóa học đang được mở bán.");

        var exists = await _favorites.GetQueryable().AsNoTracking()
            .AnyAsync(favorite => favorite.LearnerId == learnerId && favorite.CourseId == courseId);
        if (exists) return;

        await _favorites.AddAsync(new LearnerFavoriteCourse
        {
            LearnerId = learnerId,
            CourseId = courseId,
            CreatedAt = DateTime.UtcNow
        });
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task RemoveFavoriteAsync(int learnerId, int courseId)
    {
        var favorite = await _favorites.GetQueryable()
            .FirstOrDefaultAsync(item => item.LearnerId == learnerId && item.CourseId == courseId);
        if (favorite is null) return;

        _favorites.Remove(favorite);
        await _unitOfWork.SaveChangesAsync();
    }
}
