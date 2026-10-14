using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("QUIZ_ANSWER_SCENARIO_PATH")]
public class QuizAnswerScenarioPath
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("AnswerScenarioPathID")]
    public int AnswerScenarioPathId { get; set; }

    [Required]
    [Column("QuizAnswerID")]
    public int QuizAnswerId { get; set; }

    [Required]
    [Column("NodeID")]
    public int NodeId { get; set; }

    [Required]
    [Column("ScenarioChoiceID")]
    public int ScenarioChoiceId { get; set; }

    [Column("StepOrder")]
    public int StepOrder { get; set; }

    [Column("Score", TypeName = "decimal(8,2)")]
    public decimal Score { get; set; } = 0;

    [Column("AnsweredAt")]
    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("QuizAnswerId")]
    public virtual QuizAnswer QuizAnswer { get; set; } = null!;

    [ForeignKey("NodeId")]
    public virtual ScenarioNode Node { get; set; } = null!;

    [ForeignKey("ScenarioChoiceId")]
    public virtual ScenarioChoice ScenarioChoice { get; set; } = null!;
}