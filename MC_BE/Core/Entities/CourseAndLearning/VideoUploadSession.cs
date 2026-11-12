using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("video_upload_sessions")]
public sealed class VideoUploadSession
{
    [Key]
    [Column("SessionID")]
    public Guid SessionId { get; set; } = Guid.NewGuid();

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [Column("LessonID")]
    public int LessonId { get; set; }

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
}
