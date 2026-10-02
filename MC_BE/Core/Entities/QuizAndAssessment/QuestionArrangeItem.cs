using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("QUESTION_ARRANGE_ITEM")]
public class QuestionArrangeItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ArrangeItemID")]
    public int ArrangeItemId { get; set; }

    [Required]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [Required]
    [Column("Content")]
    public string Content { get; set; } = string.Empty;

    [Column("CorrectOrder")]
    public int? CorrectOrder { get; set; }

    [Column("IsDistractor")]
    public bool IsDistractor { get; set; } = false;

    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;

    public virtual ICollection<QuizAnswerArrangeItem> AnswerArrangeItems { get; set; } = new List<QuizAnswerArrangeItem>();
}