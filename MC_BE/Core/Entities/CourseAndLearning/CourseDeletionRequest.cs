using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

/// <summary>Auditable instructor request to permanently delete a previously public course.</summary>
[Table("course_deletion_requests")]
public sealed class CourseDeletionRequest
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("RequestID")]
    public long RequestId { get; set; }

    // Snapshot values and no FK are intentional: the moderation record must survive course deletion.
    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("CourseTitle")]
    public string CourseTitle { get; set; } = string.Empty;

    [Required]
    [Column("InstructorID")]
    public int InstructorId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("InstructorName")]
    public string InstructorName { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    [Column("Reason")]
    public string Reason { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING";

    [Required]
    [Column("RequestedAt")]
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    [Column("ReviewedByID")]
    public int? ReviewedById { get; set; }

    [Column("ReviewedAt")]
    public DateTime? ReviewedAt { get; set; }

    [MaxLength(1000)]
    [Column("AdminNote")]
    public string? AdminNote { get; set; }
}
