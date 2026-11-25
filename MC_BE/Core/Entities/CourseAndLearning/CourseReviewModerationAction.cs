using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("course_review_moderation_actions")]
public class CourseReviewModerationAction
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ActionID")]
    public long ActionId { get; set; }

    [Column("CourseID")]
    public int CourseId { get; set; }

    [Column("ReviewID")]
    public int? ReviewId { get; set; }

    [Column("ReportID")]
    public int? ReportId { get; set; }

    [Column("TargetLearnerID")]
    public int? TargetLearnerId { get; set; }

    [Column("AdminID")]
    public int AdminId { get; set; }

    [Required, MaxLength(32)]
    [Column("ActionType")]
    public string ActionType { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    [Column("Reason", TypeName = "text")]
    public string Reason { get; set; } = string.Empty;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Course Course { get; set; } = null!;
    public virtual CourseReview? Review { get; set; }
    public virtual CourseReviewReport? Report { get; set; }
    public virtual User Admin { get; set; } = null!;
    public virtual User? TargetLearner { get; set; }
}

