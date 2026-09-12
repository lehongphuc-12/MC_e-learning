using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("COURSE_MATERIAL")]
public class CourseMaterial
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("MaterialID")]
    public int MaterialId { get; set; }

    [Column("CourseID")]
    public int? CourseId { get; set; }

    [Column("LessonID")]
    public int? LessonId { get; set; }

    [Required]
    [Column("UploaderID")]
    public int UploaderId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Column("MaterialType")]
    public MaterialType? MaterialType { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("FileUrl")]
    public string FileUrl { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CourseId")]
    public virtual Course? Course { get; set; }

    [ForeignKey("LessonId")]
    public virtual Lesson? Lesson { get; set; }

    [ForeignKey("UploaderId")]
    public virtual User Uploader { get; set; } = null!;
}
