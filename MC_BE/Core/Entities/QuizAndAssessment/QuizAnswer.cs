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

    // Legacy: giữ lại để tương thích dữ liệu Single Choice cũ.
    [Column("SelectedChoiceID")]
    public int? SelectedChoiceId { get; set; }

    [Column("TextAnswer")]
    public string? TextAnswer { get; set; }

    [Column("IsCorrect")]
    public bool? IsCorrect { get; set; }

    [Column("Score", TypeName = "decimal(8,2)")]
    public decimal? Score { get; set; }

    [Column("MaxScore", TypeName = "decimal(8,2)")]
    public decimal MaxScore { get; set; } = 1.00m;

    [Column("TeacherFeedback")]
    public string? TeacherFeedback { get; set; }

    [Column("GradedByID")]
    public int? GradedById { get; set; }

    [Column("GradedAt")]
    public DateTime? GradedAt { get; set; }

    [Column("AnsweredAt")]
    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("AttemptId")]
    public virtual QuizAttempt Attempt { get; set; } = null!;

    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;

    [ForeignKey("SelectedChoiceId")]
    public virtual Choice? SelectedChoice { get; set; }

    [ForeignKey("GradedById")]
    public virtual User? GradedBy { get; set; }

    public virtual ICollection<QuizAnswerSelectedChoice> SelectedChoices { get; set; } = new List<QuizAnswerSelectedChoice>();
    public virtual ICollection<QuizAnswerErrorRegion> ErrorRegions { get; set; } = new List<QuizAnswerErrorRegion>();
    public virtual ICollection<QuizAnswerAnnotation> Annotations { get; set; } = new List<QuizAnswerAnnotation>();
    public virtual ICollection<QuizAnswerArrangeItem> ArrangeItems { get; set; } = new List<QuizAnswerArrangeItem>();
    public virtual ICollection<QuizAnswerScenarioPath> ScenarioPaths { get; set; } = new List<QuizAnswerScenarioPath>();
}