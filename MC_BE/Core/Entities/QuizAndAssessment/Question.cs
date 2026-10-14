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

    [Column("Instruction")]
    public string? Instruction { get; set; }

    [Column("Explanation")]
    public string? Explanation { get; set; }

    [Column("Points", TypeName = "decimal(8,2)")]
    public decimal Points { get; set; } = 1.00m;

    [Column("IsRequired")]
    public bool IsRequired { get; set; } = true;

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 1;

    [ForeignKey("QuizId")]
    public virtual Quiz Quiz { get; set; } = null!;

    public virtual ICollection<Choice> Choices { get; set; } = new List<Choice>();
    public virtual ICollection<QuestionMedia> Media { get; set; } = new List<QuestionMedia>();
    public virtual ICollection<QuestionErrorRegion> ErrorRegions { get; set; } = new List<QuestionErrorRegion>();
    public virtual ICollection<QuestionAnnotation> Annotations { get; set; } = new List<QuestionAnnotation>();
    public virtual ICollection<QuestionArrangeItem> ArrangeItems { get; set; } = new List<QuestionArrangeItem>();
    public virtual QuestionWritingConfig? WritingConfig { get; set; }
    public virtual ICollection<ScenarioNode> ScenarioNodes { get; set; } = new List<ScenarioNode>();
    public virtual ICollection<QuizAnswer> QuizAnswers { get; set; } = new List<QuizAnswer>();
}