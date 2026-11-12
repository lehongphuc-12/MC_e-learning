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

    [Required]
    [Column("LessonID")]
    public int LessonId { get; set; }

    [Required]
    [MaxLength(500)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Column("OriginalContent")]
    public string? OriginalContent { get; set; }

    [Column("CreatedBy")]
    public int? CreatedBy { get; set; }

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("Status")]
    public SpeakingScriptStatus Status { get; set; } = SpeakingScriptStatus.DRAFT;

    // Navigation properties
    [ForeignKey("LessonId")]
    public virtual Lesson Lesson { get; set; } = null!;

    [ForeignKey("CreatedBy")]
    public virtual User? CreatedByUser { get; set; }

    public virtual ICollection<SpeakingScriptLevel> Levels { get; set; } = new List<SpeakingScriptLevel>();
}
