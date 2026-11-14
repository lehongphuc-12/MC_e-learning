using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

/// <summary>
/// Immutable syllabus file revision. A course submission stores the exact revision ID
/// that Admin reviewed, while a previously approved revision remains available to learners
/// until a replacement is approved.
/// </summary>
[Table("course_syllabus_versions")]
public class CourseSyllabusVersion
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    // Keep the mapped identifier aligned with the column name created by the initial
    // versioning migration ("SyllabusVersionId"). PostgreSQL treats quoted casing as exact.
    [Column("SyllabusVersionId")]
    public int SyllabusVersionId { get; set; }

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [Column("VersionNumber")]
    public int VersionNumber { get; set; }

    [Required]
    [MaxLength(700)]
    [Column("ObjectKey")]
    public string ObjectKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("OriginalFileName")]
    public string OriginalFileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("ContentType")]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    [Column("FileExtension")]
    public string FileExtension { get; set; } = string.Empty;

    [Column("FileSizeBytes")]
    public long FileSizeBytes { get; set; }

    [Required]
    [MaxLength(24)]
    [Column("ReviewStatus")]
    public string ReviewStatus { get; set; } = "DRAFT";

    [Required]
    [Column("IsCurrent")]
    public bool IsCurrent { get; set; } = true;

    [Required]
    [Column("UploadedByID")]
    public int UploadedById { get; set; }

    [Column("UploadedAt")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    [Column("SubmittedAt")]
    public DateTime? SubmittedAt { get; set; }

    [Column("WasPublishedBeforeSubmission")]
    public bool WasPublishedBeforeSubmission { get; set; }

    [Column("ReviewedByID")]
    public int? ReviewedById { get; set; }

    [Column("ReviewedAt")]
    public DateTime? ReviewedAt { get; set; }

    [Column("ReviewNote", TypeName = "text")]
    public string? ReviewNote { get; set; }

    // Frozen with the revision on submission so public preview never shows content
    // from a newer, not-yet-approved course edit.
    [Column("PreviewDescription", TypeName = "text")]
    public string? PreviewDescription { get; set; }

    [Column("PreviewTargetAudience", TypeName = "text")]
    public string? PreviewTargetAudience { get; set; }

    [Column("PreviewPrerequisites", TypeName = "text")]
    public string? PreviewPrerequisites { get; set; }

    [Column("PreviewLearningOutcomes", TypeName = "text")]
    public string? PreviewLearningOutcomes { get; set; }

    [Column("PreviewAssessmentOverview", TypeName = "text")]
    public string? PreviewAssessmentOverview { get; set; }

    public virtual Course Course { get; set; } = null!;
    public virtual User UploadedBy { get; set; } = null!;
    public virtual User? ReviewedBy { get; set; }
}
