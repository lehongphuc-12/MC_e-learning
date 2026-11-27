using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("enrollment_access_extension_requests")]
public sealed class EnrollmentAccessExtensionRequest
{
    [Key]
    public long RequestId { get; set; }

    [Required]
    public int EnrollmentId { get; set; }

    [Required]
    public int LearnerId { get; set; }

    [Required]
    public int CourseId { get; set; }

    // Set for grant-backed purchases/gifts so approval extends the requested entitlement source.
    public long? CourseAccessGrantId { get; set; }

    [Required, MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Status { get; set; } = "PENDING";

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }

    public int? ReviewedByAdminId { get; set; }

    public int? GrantedDays { get; set; }

    [MaxLength(1000)]
    public string? DecisionNote { get; set; }

    public Enrollment Enrollment { get; set; } = null!;
    public User Learner { get; set; } = null!;
    public Course Course { get; set; } = null!;
    public CourseAccessGrant? CourseAccessGrant { get; set; }
    public User? ReviewedByAdmin { get; set; }
}
