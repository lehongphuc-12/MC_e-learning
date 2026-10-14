using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("QUIZ_ANSWER_ANNOTATION")]
public class QuizAnswerAnnotation
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("AnswerAnnotationID")]
    public int AnswerAnnotationId { get; set; }

    [Required]
    [Column("QuizAnswerID")]
    public int QuizAnswerId { get; set; }

    [Required]
    [Column("AnnotationType")]
    public AnnotationType AnnotationType { get; set; }

    [Column("StartIndex")]
    public int StartIndex { get; set; }

    [Column("EndIndex")]
    public int EndIndex { get; set; }

    [Column("AnnotationValue")]
    public string? AnnotationValue { get; set; }

    [Column("MatchedAnnotationID")]
    public int? MatchedAnnotationId { get; set; }

    [Column("Score", TypeName = "decimal(8,2)")]
    public decimal Score { get; set; } = 0;

    [ForeignKey("QuizAnswerId")]
    public virtual QuizAnswer QuizAnswer { get; set; } = null!;

    [ForeignKey("MatchedAnnotationId")]
    public virtual QuestionAnnotation? MatchedAnnotation { get; set; }
}