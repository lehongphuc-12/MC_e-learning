using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

/// <summary>Tracks a short-lived direct-to-R2 syllabus upload and cleans up abandoned objects.</summary>
[Table("course_syllabus_upload_sessions")]
public class CourseSyllabusUploadSession
{
    [Key]
    [Column("SessionID")]
    public Guid SessionId { get; set; } = Guid.NewGuid();

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [Column("InstructorID")]
    public int InstructorId { get; set; }

    [Required]
    [MaxLength(700)]
    [Column("ObjectKey")]
    public string ObjectKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("FileName")]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("ContentType")]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    [Column("FileExtension")]
    public string FileExtension { get; set; } = string.Empty;

    [Column("ExpectedSize")]
    public long ExpectedSize { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING";

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("ExpiresAt")]
    public DateTime ExpiresAt { get; set; }

    [Column("CompletedAt")]
    public DateTime? CompletedAt { get; set; }

    public virtual Course Course { get; set; } = null!;
    public virtual User Instructor { get; set; } = null!;
}
