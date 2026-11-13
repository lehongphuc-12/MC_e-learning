using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("course_access_grants")]
public sealed class CourseAccessGrant
{
    [Key]
    public long GrantId { get; set; }

    [Required]
    public int LearnerId { get; set; }

    [Required]
    public int CourseId { get; set; }

    [Required, MaxLength(30)]
    public string SourceType { get; set; } = string.Empty;

    // PaymentItemId is the idempotency key: one item can grant a given target course only once.
    public int? SourcePaymentItemId { get; set; }

    // Gift grants are revoked when this paid-course enrollment receives its certificate.
    public int? SourceEnrollmentId { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "ACTIVE";

    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

    public DateTime? RevokedAt { get; set; }

    [MaxLength(80)]
    public string? RevocationReason { get; set; }

    public DateTime? ExpiresAt { get; set; }

    [ForeignKey(nameof(LearnerId))]
    public User Learner { get; set; } = null!;

    [ForeignKey(nameof(CourseId))]
    public Course Course { get; set; } = null!;

    [ForeignKey(nameof(SourcePaymentItemId))]
    public PaymentItem? SourcePaymentItem { get; set; }

    [ForeignKey(nameof(SourceEnrollmentId))]
    public Enrollment? SourceEnrollment { get; set; }
}
