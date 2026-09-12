using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("LESSON")]
public class Lesson
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("LessonID")]
    public int LessonId { get; set; }

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    [Column("LessonType")]
    public LessonType? LessonType { get; set; }

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 1;

    [Column("DurationMinutes")]
    public int DurationMinutes { get; set; } = 0;

    [Column("IsPreview")]
    public bool IsPreview { get; set; } = false;

    [Column("Status")]
    public LessonStatus Status { get; set; } = LessonStatus.ACTIVE;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CourseId")]
    public virtual Course Course { get; set; } = null!;

    public virtual ICollection<CourseMaterial> CourseMaterials { get; set; } = new List<CourseMaterial>();
    public virtual ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();
    public virtual ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
}
