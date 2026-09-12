using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("COURSE")]
public class Course
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Column("CategoryID")]
    public int? CategoryId { get; set; }

    [Required]
    [Column("InstructorID")]
    public int InstructorId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("Slug")]
    public string Slug { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    [MaxLength(255)]
    [Column("ThumbnailUrl")]
    public string? ThumbnailUrl { get; set; }

    [Column("Price", TypeName = "decimal(10,2)")]
    public decimal Price { get; set; } = 0.00m;

    [Column("Level")]
    public CourseLevel? Level { get; set; }

    [Column("Status")]
    public CourseStatus Status { get; set; } = CourseStatus.DRAFT;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CategoryId")]
    public virtual Category? Category { get; set; }

    [ForeignKey("InstructorId")]
    public virtual User Instructor { get; set; } = null!;

    public virtual ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public virtual ICollection<CourseMaterial> CourseMaterials { get; set; } = new List<CourseMaterial>();
    public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public virtual ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();
}
