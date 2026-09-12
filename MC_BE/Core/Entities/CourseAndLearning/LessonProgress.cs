using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("LESSON_PROGRESS")]
public class LessonProgress
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("LessonProgressID")]
    public int LessonProgressId { get; set; }

    [Required]
    [Column("EnrollmentID")]
    public int EnrollmentId { get; set; }

    [Required]
    [Column("LessonID")]
    public int LessonId { get; set; }

    [Column("Status")]
    public LessonProgressStatus Status { get; set; } = LessonProgressStatus.NOT_STARTED;

    [Column("TimeSpentMinutes")]
    public int TimeSpentMinutes { get; set; } = 0;

    [Column("LastAccessedAt")]
    public DateTime? LastAccessedAt { get; set; }

    [Column("CompletedAt")]
    public DateTime? CompletedAt { get; set; }

    // Navigation properties
    [ForeignKey("EnrollmentId")]
    public virtual Enrollment Enrollment { get; set; } = null!;

    [ForeignKey("LessonId")]
    public virtual Lesson Lesson { get; set; } = null!;
}
