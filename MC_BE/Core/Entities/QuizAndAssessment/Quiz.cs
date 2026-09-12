using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("QUIZ")]
public class Quiz
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("QuizID")]
    public int QuizId { get; set; }

    [Column("CourseID")]
    public int? CourseId { get; set; }

    [Column("LessonID")]
    public int? LessonId { get; set; }

    [Required]
    [Column("CreatedByID")]
    public int CreatedById { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    [Column("TimeLimitMinutes")]
    public int TimeLimitMinutes { get; set; } = 0;

    [Column("PassingScore", TypeName = "decimal(5,2)")]
    public decimal PassingScore { get; set; } = 80.00m;

    [Column("MaxAttempts")]
    public int MaxAttempts { get; set; } = 1;

    [Column("Status")]
    public QuizStatus Status { get; set; } = QuizStatus.ACTIVE;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CourseId")]
    public virtual Course? Course { get; set; }

    [ForeignKey("LessonId")]
    public virtual Lesson? Lesson { get; set; }

    [ForeignKey("CreatedById")]
    public virtual User CreatedBy { get; set; } = null!;

    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();
    public virtual ICollection<QuizAttempt> QuizAttempts { get; set; } = new List<QuizAttempt>();
}
