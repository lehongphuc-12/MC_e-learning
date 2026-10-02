using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("speaking_submissions")]
public class SpeakingSubmission
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("SubmissionID")]
    public int SubmissionId { get; set; }

    [Required]
    [Column("LessonID")]
    public int LessonId { get; set; }

    [Required]
    [Column("LearnerID")]
    public int LearnerId { get; set; }

    [Required]
    [MaxLength(1000)]
    [Column("AudioUrl")]
    public string AudioUrl { get; set; } = string.Empty;

    [Column("Note")]
    public string? Note { get; set; }

    [Column("Status")]
    public SpeakingSubmissionStatus Status { get; set; } = SpeakingSubmissionStatus.SUBMITTED;

    [Column("Score", TypeName = "decimal(5,2)")]
    public decimal? Score { get; set; }

    [Column("Feedback")]
    public string? Feedback { get; set; }

    [Column("GradedByID")]
    public int? GradedById { get; set; }

    [Column("GradedAt")]
    public DateTime? GradedAt { get; set; }

    [Column("SubmittedAt")]
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("LessonId")]
    public virtual Lesson Lesson { get; set; } = null!;

    [ForeignKey("LearnerId")]
    public virtual User Learner { get; set; } = null!;

    [ForeignKey("GradedById")]
    public virtual User? GradedBy { get; set; }
}
