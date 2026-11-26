using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("speaking_rubric_criteria")]
public class SpeakingRubricCriterion
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("CriterionID")]
    public int CriterionId { get; set; }

    [Required]
    [Column("ScriptID")]
    public int ScriptId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("Code")]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("Name")]
    public string Name { get; set; } = string.Empty;

    [Column("WeightPercentage", TypeName = "decimal(5,2)")]
    public decimal WeightPercentage { get; set; }

    [Column("IsMandatory")]
    public bool IsMandatory { get; set; } = false;

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 0;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("ScriptId")]
    public virtual SpeakingScript Script { get; set; } = null!;
}
