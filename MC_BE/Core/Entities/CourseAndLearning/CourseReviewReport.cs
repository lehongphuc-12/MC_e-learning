using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("course_review_reports")]
public class CourseReviewReport
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ReportID")]
    public int ReportId { get; set; }

    [Column("ReviewID")]
    public int ReviewId { get; set; }

    [Column("ReporterLearnerID")]
    public int ReporterLearnerId { get; set; }

    [Required, MaxLength(32)]
    [Column("Category")]
    public string Category { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Column("Details", TypeName = "text")]
    public string? Details { get; set; }

    [Required, MaxLength(24)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING";

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("ReviewedAt")]
    public DateTime? ReviewedAt { get; set; }

    [Column("ReviewedByAdminID")]
    public int? ReviewedByAdminId { get; set; }

    [MaxLength(1000)]
    [Column("ResolutionNote", TypeName = "text")]
    public string? ResolutionNote { get; set; }

    public virtual CourseReview Review { get; set; } = null!;
    public virtual User ReporterLearner { get; set; } = null!;
    public virtual User? ReviewedByAdmin { get; set; }
}

