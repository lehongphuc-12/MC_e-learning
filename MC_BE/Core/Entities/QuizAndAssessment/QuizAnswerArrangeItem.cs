using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("QUIZ_ANSWER_ARRANGE_ITEM")]
public class QuizAnswerArrangeItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("AnswerArrangeItemID")]
    public int AnswerArrangeItemId { get; set; }

    [Required]
    [Column("QuizAnswerID")]
    public int QuizAnswerId { get; set; }

    [Required]
    [Column("ArrangeItemID")]
    public int ArrangeItemId { get; set; }

    [Column("SelectedOrder")]
    public int? SelectedOrder { get; set; }

    [Column("IsIncluded")]
    public bool IsIncluded { get; set; } = true;

    [ForeignKey("QuizAnswerId")]
    public virtual QuizAnswer QuizAnswer { get; set; } = null!;

    [ForeignKey("ArrangeItemId")]
    public virtual QuestionArrangeItem ArrangeItem { get; set; } = null!;
}