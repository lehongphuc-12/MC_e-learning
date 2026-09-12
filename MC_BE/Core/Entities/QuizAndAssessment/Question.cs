using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("QUESTION")]
public class Question
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [Required]
    [Column("QuizID")]
    public int QuizId { get; set; }

    [Required]
    [Column("QuestionText")]
    public string QuestionText { get; set; } = string.Empty;

    [Required]
    [Column("QuestionType")]
    public QuestionType QuestionType { get; set; }

    [Column("Explanation")]
    public string? Explanation { get; set; }

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 1;

    // Navigation properties
    [ForeignKey("QuizId")]
    public virtual Quiz Quiz { get; set; } = null!;

    public virtual ICollection<Choice> Choices { get; set; } = new List<Choice>();
    public virtual ICollection<QuizAnswer> QuizAnswers { get; set; } = new List<QuizAnswer>();
}
