using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("SCENARIO_CHOICE")]
public class ScenarioChoice
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ScenarioChoiceID")]
    public int ScenarioChoiceId { get; set; }

    [Required]
    [Column("NodeID")]
    public int NodeId { get; set; }

    [Required]
    [Column("ChoiceText")]
    public string ChoiceText { get; set; } = string.Empty;

    [Column("NextNodeID")]
    public int? NextNodeId { get; set; }

    [Column("Score", TypeName = "decimal(8,2)")]
    public decimal Score { get; set; } = 0;

    [Column("Feedback")]
    public string? Feedback { get; set; }

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 1;

    [ForeignKey("NodeId")]
    public virtual ScenarioNode Node { get; set; } = null!;

    [ForeignKey("NextNodeId")]
    public virtual ScenarioNode? NextNode { get; set; }

    public virtual ICollection<QuizAnswerScenarioPath> AnswerPaths { get; set; } = new List<QuizAnswerScenarioPath>();
}