using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("background_musics")]
public class BackgroundMusic
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("MusicId")]
    public int MusicId { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    [Column("AudioUrl")]
    public string AudioUrl { get; set; } = string.Empty;

    [MaxLength(500)]
    [Column("CloudinaryPublicId")]
    public string? CloudinaryPublicId { get; set; }

    [Column("IsSystemDefault")]
    public bool IsSystemDefault { get; set; } = false;

    [Column("LessonId")]
    public int? LessonId { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey("LessonId")]
    public virtual Lesson? Lesson { get; set; }
}
