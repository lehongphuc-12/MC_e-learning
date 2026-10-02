using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("QUESTION_ANNOTATION")]
public class QuestionAnnotation
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("AnnotationID")]
    public int AnnotationId { get; set; }

    [Required]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [Required]
    [Column("AnnotationType")]
    public AnnotationType AnnotationType { get; set; }

    [Column("StartIndex")]
    public int StartIndex { get; set; }

    [Column("EndIndex")]
    public int EndIndex { get; set; }

    [Column("AnnotationValue")]
    public string? AnnotationValue { get; set; }

    [Column("Explanation")]
    public string? Explanation { get; set; }

    [Column("Points", TypeName = "decimal(8,2)")]
    public decimal Points { get; set; } = 1.00m;

    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;

    public virtual ICollection<QuizAnswerAnnotation> AnswerAnnotations { get; set; } = new List<QuizAnswerAnnotation>();
}