using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("speaking_scripts")]
public class SpeakingScript
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ScriptID")]
    public int ScriptId { get; set; }

    [Column("CourseID")]
    public int CourseId { get; set; }

    [Column("ModuleID")]
    public int? ModuleId { get; set; }

    [Column("LessonID")]
    public int? LessonId { get; set; }

    [Column("Scope")]
    public SpeakingScope Scope { get; set; } = SpeakingScope.FINAL;

    [Required]
    [MaxLength(500)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Column("OriginalContent")]
    public string? OriginalContent { get; set; }

    [Column("PassingScore", TypeName = "decimal(5,2)")]
    public decimal PassingScore { get; set; } = 80.00m;

    [Column("CreatedBy")]
    public int? CreatedBy { get; set; }

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("Status")]
    public SpeakingScriptStatus Status { get; set; } = SpeakingScriptStatus.DRAFT;

    // Navigation properties
    [ForeignKey("CourseId")]
    public virtual Course Course { get; set; } = null!;

    [ForeignKey("ModuleId")]
    public virtual Module? Module { get; set; }

    [ForeignKey("LessonId")]
    public virtual Lesson? Lesson { get; set; }

    [ForeignKey("CreatedBy")]
    public virtual User? CreatedByUser { get; set; }

    public virtual ICollection<SpeakingScriptLevel> Levels { get; set; } = new List<SpeakingScriptLevel>();
}
