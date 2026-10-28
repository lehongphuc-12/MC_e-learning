using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("QUESTION_WRITING_CONFIG")]
public class QuestionWritingConfig
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("WritingConfigID")]
    public int WritingConfigId { get; set; }

    [Required]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [MaxLength(255)]
    [Column("EventType")]
    public string? EventType { get; set; }

    [MaxLength(255)]
    [Column("Audience")]
    public string? Audience { get; set; }

    [MaxLength(255)]
    [Column("Style")]
    public string? Style { get; set; }

    [Column("MinWords")]
    public int? MinWords { get; set; }

    [Column("MaxWords")]
    public int? MaxWords { get; set; }

    [Column("RequiredElementsJson")]
    public string? RequiredElementsJson { get; set; }

    [Column("GradingRubricJson")]
    public string? GradingRubricJson { get; set; }

    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;
}