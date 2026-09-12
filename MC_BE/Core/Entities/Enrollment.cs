using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("ENROLLMENT")]
public class Enrollment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("EnrollmentID")]
    public int EnrollmentId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Column("EnrollmentDate")]
    public DateTime EnrollmentDate { get; set; } = DateTime.UtcNow;

    [Column("Status")]
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.ACTIVE;

    [Column("ProgressPercent", TypeName = "decimal(5,2)")]
    public decimal ProgressPercent { get; set; } = 0.00m;

    [Column("CompletedAt")]
    public DateTime? CompletedAt { get; set; }

    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("CourseId")]
    public virtual Course Course { get; set; } = null!;

    public virtual ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
