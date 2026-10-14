using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("QUESTION_ERROR_REGION")]
public class QuestionErrorRegion
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ErrorRegionID")]
    public int ErrorRegionId { get; set; }

    [Required]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [Column("StartTimeMs")]
    public int StartTimeMs { get; set; }

    [Column("EndTimeMs")]
    public int EndTimeMs { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("ErrorCategory")]
    public string ErrorCategory { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("ErrorCode")]
    public string ErrorCode { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    [Column("CorrectionText")]
    public string? CorrectionText { get; set; }

    [Column("Points", TypeName = "decimal(8,2)")]
    public decimal Points { get; set; } = 1.00m;

    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;

    public virtual ICollection<QuizAnswerErrorRegion> AnswerErrorRegions { get; set; } = new List<QuizAnswerErrorRegion>();
}