using System.Collections.Generic;

namespace MC_BE.Features.Courses.DTOs;

public class CourseRecommendationDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? CategoryName { get; set; }
    public int? CategoryId { get; set; }
    public string? InstructorName { get; set; }
    public int InstructorId { get; set; }
    public string? Level { get; set; }
    public string Duration { get; set; } = "Chưa cập nhật";
    public double Rating { get; set; } = 5.0;
    public int ReviewCount { get; set; }
    public decimal Price { get; set; }
    public decimal OriginalPrice { get; set; }
    public int DiscountPercent { get; set; }
    public bool IsFree { get; set; }
    public string? SkillTags { get; set; }
    public int? PrerequisiteCourseId { get; set; }
    public string? PrerequisiteCourseTitle { get; set; }

    // Recommendation scoring breakdown (0.0 -> 1.0)
    public double TotalScore { get; set; }
    public double SkillGapScore { get; set; }
    public double CategoryAndLevelScore { get; set; }
    public double NextStepScore { get; set; }
    public double PopularityScore { get; set; }
    public string RecommendationReason { get; set; } = string.Empty;
    public bool IsColdStartRecommendation { get; set; }
}

public class CourseRecommendationResponse
{
    public bool IsColdStart { get; set; }
    public string UserExperienceLevel { get; set; } = string.Empty;
    public List<string> TargetCategories { get; set; } = new();
    public List<string> FocusSkills { get; set; } = new();
    public List<CourseRecommendationDto> Courses { get; set; } = new();
}
