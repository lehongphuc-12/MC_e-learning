using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Courses.DTOs;

public sealed class AdminCourseReviewDto
{
    public int ReviewId { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public int LearnerId { get; set; }
    public string LearnerName { get; set; } = string.Empty;
    public string LearnerEmail { get; set; } = string.Empty;
    public bool IsAnonymous { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ModerationReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsLearnerBlocked { get; set; }
}

public sealed class AdminCourseReviewReportDto
{
    public int ReportId { get; set; }
    public int ReviewId { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public int ReviewAuthorId { get; set; }
    public string ReviewAuthorName { get; set; } = string.Empty;
    public string ReviewAuthorEmail { get; set; } = string.Empty;
    public bool ReviewAuthorChoseAnonymous { get; set; }
    public int Rating { get; set; }
    public string? ReviewComment { get; set; }
    public string ReviewStatus { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string Status { get; set; } = string.Empty;
    public int ReporterId { get; set; }
    public string ReporterName { get; set; } = string.Empty;
    public string ReporterEmail { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ResolutionNote { get; set; }
}

public sealed class AdminCourseReviewActionDto
{
    public long ActionId { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public int? ReviewId { get; set; }
    public int? ReportId { get; set; }
    public int? TargetLearnerId { get; set; }
    public string? TargetLearnerName { get; set; }
    public string AdminName { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public sealed class AdminCourseReviewPageDto<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
}

public sealed class ResolveCourseReviewReportRequest
{
    [Required, RegularExpression("^(DISMISS|TAKE_ACTION)$")]
    public string Decision { get; set; } = string.Empty;

    [RegularExpression("^(HIDE|REMOVE|RESTORE)?$")]
    public string? ReviewAction { get; set; }

    public bool BlockAuthorForCourse { get; set; }

    [Required, MinLength(3), MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}

public sealed class ModerateCourseReviewRequest
{
    [Required, RegularExpression("^(HIDE|REMOVE|RESTORE)$")]
    public string Action { get; set; } = string.Empty;

    [Required, MinLength(3), MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}

public sealed class BlockCourseReviewerRequest
{
    [Required, MinLength(3), MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;

    public int? TriggerReviewId { get; set; }
}

public sealed class UnblockCourseReviewerRequest
{
    [Required, MinLength(3), MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}
