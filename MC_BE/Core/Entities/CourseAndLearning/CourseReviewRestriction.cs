using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("course_review_restrictions")]
public class CourseReviewRestriction
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("RestrictionID")]
    public int RestrictionId { get; set; }

    [Column("CourseID")]
    public int CourseId { get; set; }

    [Column("LearnerID")]
    public int LearnerId { get; set; }

    [Column("TriggerReviewID")]
    public int? TriggerReviewId { get; set; }

    [Column("CreatedByAdminID")]
    public int CreatedByAdminId { get; set; }

    [Required, MaxLength(1000)]
    [Column("Reason", TypeName = "text")]
    public string Reason { get; set; } = string.Empty;

    [Column("IsActive")]
    public bool IsActive { get; set; } = true;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("LiftedAt")]
    public DateTime? LiftedAt { get; set; }

    [Column("LiftedByAdminID")]
    public int? LiftedByAdminId { get; set; }

    [MaxLength(1000)]
    [Column("LiftReason", TypeName = "text")]
    public string? LiftReason { get; set; }

    public virtual Course Course { get; set; } = null!;
    public virtual User Learner { get; set; } = null!;
    public virtual User CreatedByAdmin { get; set; } = null!;
    public virtual User? LiftedByAdmin { get; set; }
    public virtual CourseReview? TriggerReview { get; set; }
}

