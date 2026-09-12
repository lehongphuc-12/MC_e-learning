using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("QUIZ_ATTEMPT")]
public class QuizAttempt
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("AttemptID")]
    public int AttemptId { get; set; }

    [Required]
    [Column("QuizID")]
    public int QuizId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Column("AttemptNumber")]
    public int AttemptNumber { get; set; } = 1;

    [Column("Score", TypeName = "decimal(5,2)")]
    public decimal? Score { get; set; }

    [Column("ResultStatus")]
    public QuizAttemptStatus? ResultStatus { get; set; }

    [Column("StartedAt")]
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    [Column("SubmittedAt")]
    public DateTime? SubmittedAt { get; set; }

    // Navigation properties
    [ForeignKey("QuizId")]
    public virtual Quiz Quiz { get; set; } = null!;

    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    public virtual ICollection<QuizAnswer> QuizAnswers { get; set; } = new List<QuizAnswer>();
}
