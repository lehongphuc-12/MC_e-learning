using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Enrollment.DTO;

public sealed class CreateAccessExtensionRequest
{
    [Required, StringLength(1000, MinimumLength = 10)]
    public string Reason { get; set; } = string.Empty;
}

public sealed class DecideAccessExtensionRequest
{
    [Range(1, 90)]
    public int GrantedDays { get; set; } = 30;

    [StringLength(1000)]
    public string? DecisionNote { get; set; }
}

public sealed class EnrollmentAccessExtensionDto
{
    public long RequestId { get; set; }
    public int EnrollmentId { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public int LearnerId { get; set; }
    public string LearnerName { get; set; } = string.Empty;
    public string LearnerEmail { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public long? CourseAccessGrantId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByAdminName { get; set; }
    public int? GrantedDays { get; set; }
    public string? DecisionNote { get; set; }
}
