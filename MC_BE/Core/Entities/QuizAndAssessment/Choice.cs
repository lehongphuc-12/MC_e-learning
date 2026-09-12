using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("CHOICE")]
public class Choice
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ChoiceID")]
    public int ChoiceId { get; set; }

    [Required]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [Required]
    [Column("ChoiceText")]
    public string ChoiceText { get; set; } = string.Empty;

    [Column("IsCorrect")]
    public bool IsCorrect { get; set; } = false;

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 1;

    // Navigation properties
    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;

    public virtual ICollection<QuizAnswer> QuizAnswers { get; set; } = new List<QuizAnswer>();
}
