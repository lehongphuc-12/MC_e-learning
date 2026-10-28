using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("SCENARIO_NODE")]
public class ScenarioNode
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("NodeID")]
    public int NodeId { get; set; }

    [Required]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [Required]
    [Column("NodeType")]
    public ScenarioNodeType NodeType { get; set; }

    [MaxLength(255)]
    [Column("Title")]
    public string? Title { get; set; }

    [Required]
    [Column("Content")]
    public string Content { get; set; } = string.Empty;

    [Column("MediaUrl")]
    public string? MediaUrl { get; set; }

    [Column("IsStartNode")]
    public bool IsStartNode { get; set; } = false;

    [Column("IsEndNode")]
    public bool IsEndNode { get; set; } = false;

    [Column("Points", TypeName = "decimal(8,2)")]
    public decimal? Points { get; set; }

    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;

    public virtual ICollection<ScenarioChoice> Choices { get; set; } = new List<ScenarioChoice>();
    public virtual ICollection<ScenarioChoice> IncomingChoices { get; set; } = new List<ScenarioChoice>();
    public virtual ICollection<QuizAnswerScenarioPath> AnswerPaths { get; set; } = new List<QuizAnswerScenarioPath>();
}