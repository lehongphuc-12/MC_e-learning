using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("QUIZ_ANSWER")]
public class QuizAnswer
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("QuizAnswerID")]
    public int QuizAnswerId { get; set; }

    [Required]
    [Column("AttemptID")]
    public int AttemptId { get; set; }

    [Required]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [Column("SelectedChoiceID")]
    public int? SelectedChoiceId { get; set; }

    [Column("IsCorrect")]
    public bool? IsCorrect { get; set; }

    [Column("AnsweredAt")]
    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("AttemptId")]
    public virtual QuizAttempt Attempt { get; set; } = null!;

    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;

    [ForeignKey("SelectedChoiceId")]
    public virtual Choice? SelectedChoice { get; set; }
}
