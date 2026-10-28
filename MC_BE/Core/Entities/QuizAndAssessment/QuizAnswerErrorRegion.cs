using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("QUIZ_ANSWER_ERROR_REGION")]
public class QuizAnswerErrorRegion
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("AnswerErrorRegionID")]
    public int AnswerErrorRegionId { get; set; }

    [Required]
    [Column("QuizAnswerID")]
    public int QuizAnswerId { get; set; }

    [Column("SelectedStartTimeMs")]
    public int SelectedStartTimeMs { get; set; }

    [Column("SelectedEndTimeMs")]
    public int? SelectedEndTimeMs { get; set; }

    [MaxLength(100)]
    [Column("SelectedErrorCategory")]
    public string? SelectedErrorCategory { get; set; }

    [MaxLength(100)]
    [Column("SelectedErrorCode")]
    public string? SelectedErrorCode { get; set; }

    [Column("MatchedErrorRegionID")]
    public int? MatchedErrorRegionId { get; set; }

    [Column("LocationScore", TypeName = "decimal(8,2)")]
    public decimal LocationScore { get; set; } = 0;

    [Column("TypeScore", TypeName = "decimal(8,2)")]
    public decimal TypeScore { get; set; } = 0;

    [ForeignKey("QuizAnswerId")]
    public virtual QuizAnswer QuizAnswer { get; set; } = null!;

    [ForeignKey("MatchedErrorRegionId")]
    public virtual QuestionErrorRegion? MatchedErrorRegion { get; set; }
}