using MC_BE.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Courses.DTOs;

// ---------------------------------------------------------------------------
// Response DTO — returned from GET endpoints
// Includes joined fields from CATEGORY and USER tables
// ---------------------------------------------------------------------------
public class CourseDto
{
    public int CourseId { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }       // Joined from CATEGORY
    public int InstructorId { get; set; }
    public string? InstructorName { get; set; }     // Joined from USER.FullName
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ThumbnailUrl { get; set; }
    public decimal Price { get; set; }
    public bool IsFree { get; set; }
    public CourseLevel? Level { get; set; }
    public CourseStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public int? ApprovedById { get; set; }
    public string? ApprovedByName { get; set; }
    public string? SubmissionNote { get; set; }
    public string? RejectionReason { get; set; }
}

// ---------------------------------------------------------------------------
// Paginated list response wrapper
// ---------------------------------------------------------------------------
public class CourseListResponse
{
    public List<CourseDto> Data { get; set; } = new();
    public PaginationMeta Pagination { get; set; } = new();
}

public class PaginationMeta
{
    public int Page { get; set; }
    public int Limit { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
}

// ---------------------------------------------------------------------------
// CREATE request DTO — POST /api/courses
// InstructorID is extracted from JWT, not accepted from the client
// ---------------------------------------------------------------------------
public class CreateCourseRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    [System.ComponentModel.DataAnnotations.MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [MaxLength(3000)] public string? PreviewTargetAudience { get; set; }
    [MaxLength(3000)] public string? PreviewPrerequisites { get; set; }
    [MaxLength(5000)] public string? PreviewLearningOutcomes { get; set; }
    [MaxLength(3000)] public string? PreviewAssessmentOverview { get; set; }

    public int? CategoryId { get; set; }

    public string? ThumbnailUrl { get; set; }

    [System.ComponentModel.DataAnnotations.Range(0, double.MaxValue, ErrorMessage = "Price must be 0 or greater")]
    public decimal Price { get; set; } = 0;

    // Nullable for backward compatibility with existing bulk-import clients;
    // omitted values are inferred from whether Price is zero.
    public bool? IsFree { get; set; }

    public CourseLevel? Level { get; set; }

    public CourseStatus Status { get; set; } = CourseStatus.DRAFT;

    public string? SubmissionNote { get; set; }

    public bool SubmitForApproval { get; set; } = false;
}

// ---------------------------------------------------------------------------
// UPDATE request DTO — PUT /api/courses/:id (all fields optional)
// ---------------------------------------------------------------------------
public class UpdateCourseRequest
{
    [System.ComponentModel.DataAnnotations.MaxLength(255)]
    public string? Title { get; set; }

    public string? Description { get; set; }

    public string? PreviewTargetAudience { get; set; }
    public string? PreviewPrerequisites { get; set; }
    public string? PreviewLearningOutcomes { get; set; }
    public string? PreviewAssessmentOverview { get; set; }

    public int? CategoryId { get; set; }

    public string? ThumbnailUrl { get; set; }

    [System.ComponentModel.DataAnnotations.Range(0, double.MaxValue)]
    public decimal? Price { get; set; }

    public bool? IsFree { get; set; }

    public CourseLevel? Level { get; set; }

    public CourseStatus? Status { get; set; }

    public string? SubmissionNote { get; set; }

    public bool SubmitForApproval { get; set; } = false;
}

// ---------------------------------------------------------------------------
// STATUS PATCH request — PATCH /api/courses/:id/status
// ---------------------------------------------------------------------------
public class UpdateCourseStatusRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    public CourseStatus Status { get; set; }

    public string? Reason { get; set; }
}

public class SubmitApprovalRequest
{
    public string? SubmissionNote { get; set; }
}

public class RejectCourseRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    public string Reason { get; set; } = string.Empty;
}

public sealed class RequestCourseDeletionRequest
{
    [Required, MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}

public sealed class ReviewCourseDeletionRequest
{
    [Required, MaxLength(1000)]
    public string AdminNote { get; set; } = string.Empty;
}

public sealed class CourseDeletionActionDto
{
    public int CourseId { get; set; }
    public string Action { get; set; } = string.Empty;
    public long? RequestId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public sealed class CourseDeletionRequestDto
{
    public long RequestId { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public int InstructorId { get; set; }
    public string InstructorName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public int EnrollmentCount { get; set; }
    public int PaymentItemCount { get; set; }
    public int SpeakingSubmissionCount { get; set; }
    public int QuizAttemptCount { get; set; }
}

public sealed class CourseDeletionRequestListDto
{
    public List<CourseDeletionRequestDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

// ---------------------------------------------------------------------------
// Category response & request DTOs
// ---------------------------------------------------------------------------
public class CategoryDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public int CoursesCount { get; set; }
}

public class CreateCategoryRequest
{
    [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Tên danh mục không được để trống")]
    [System.ComponentModel.DataAnnotations.MaxLength(100, ErrorMessage = "Tên danh mục không được vượt quá 100 ký tự")]
    public string CategoryName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Status { get; set; } = "ACTIVE";
}

public class UpdateCategoryRequest
{
    [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Tên danh mục không được để trống")]
    [System.ComponentModel.DataAnnotations.MaxLength(100, ErrorMessage = "Tên danh mục không được vượt quá 100 ký tự")]
    public string CategoryName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Status { get; set; } = "ACTIVE";
}


// ---------------------------------------------------------------------------
// Learned course response DTO — returned for learner's enrolled courses with progress
// ---------------------------------------------------------------------------
public class LearnedCourseDto
{
    public int EnrollmentId { get; set; }
    public int CourseId { get; set; }
    public CourseDto Course { get; set; } = new();
    public decimal ProgressPercent { get; set; }
    public int CompletedLecturesCount { get; set; }
    public int TotalLecturesCount { get; set; }
    public DateTime? LastAccessedAt { get; set; }
    public string? LastLectureTitle { get; set; }
    public string Status { get; set; } = "in-progress"; // "in-progress" or "completed"
    public DateTime? EnrolledDate { get; set; }
    public int? CertificateId { get; set; }
}

