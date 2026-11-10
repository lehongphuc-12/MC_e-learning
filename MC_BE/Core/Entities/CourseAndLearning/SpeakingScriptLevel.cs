using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("speaking_script_levels")]
public class SpeakingScriptLevel
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("LevelID")]
    public int LevelId { get; set; }

    [Required]
    [Column("ScriptID")]
    public int ScriptId { get; set; }

    [Required]
    [Column("Level")]
    public SpeakingLevel Level { get; set; }

    [Required]
    [Column("Content")]
    public string Content { get; set; } = string.Empty;

    [Column("CleanScriptForScoring")]
    public string? CleanScriptForScoring { get; set; }

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("ScriptId")]
    public virtual SpeakingScript Script { get; set; } = null!;
}
