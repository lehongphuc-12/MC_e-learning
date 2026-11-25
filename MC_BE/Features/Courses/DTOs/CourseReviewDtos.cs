using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Courses.DTOs;

public sealed class SubmitCourseReviewRequest
{
    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(2000)]
    public string? Comment { get; set; }
}

public sealed class CourseReviewItemDto
{
    public int ReviewId { get; set; }
    public string Author { get; set; } = "Học viên đã hoàn thành khóa học";
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class CourseReviewListDto
{
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public List<CourseReviewItemDto> Reviews { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public sealed class CourseReviewEligibilityDto
{
    public bool CanReview { get; set; }
    public bool HasReviewed { get; set; }
    public int? Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
