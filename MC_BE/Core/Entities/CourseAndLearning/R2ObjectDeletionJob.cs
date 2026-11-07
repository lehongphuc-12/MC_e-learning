using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

/// <summary>
/// Durable cleanup request. It intentionally has no FK to Course because it must survive course cascade deletion.
/// </summary>
[Table("r2_object_deletion_jobs")]
public sealed class R2ObjectDeletionJob
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("JobID")]
    public long JobId { get; set; }

    [Required]
    [Column("SourceCourseID")]
    public int SourceCourseId { get; set; }

    [Required]
    [MaxLength(700)]
    [Column("ObjectKey")]
    public string ObjectKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING";

    [Column("Attempts")]
    public int Attempts { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("NextAttemptAt")]
    public DateTime NextAttemptAt { get; set; } = DateTime.UtcNow;

    [Column("ProcessingAt")]
    public DateTime? ProcessingAt { get; set; }

    [Column("CompletedAt")]
    public DateTime? CompletedAt { get; set; }

    [Column("LastError", TypeName = "text")]
    public string? LastError { get; set; }
}
