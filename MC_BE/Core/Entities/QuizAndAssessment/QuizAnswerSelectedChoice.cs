using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("QUIZ_ANSWER_SELECTED_CHOICE")]
public class QuizAnswerSelectedChoice
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("QuizAnswerSelectedChoiceID")]
    public int QuizAnswerSelectedChoiceId { get; set; }

    [Required]
    [Column("QuizAnswerID")]
    public int QuizAnswerId { get; set; }

    [Required]
    [Column("ChoiceID")]
    public int ChoiceId { get; set; }

    [ForeignKey("QuizAnswerId")]
    public virtual QuizAnswer QuizAnswer { get; set; } = null!;

    [ForeignKey("ChoiceId")]
    public virtual Choice Choice { get; set; } = null!;
}