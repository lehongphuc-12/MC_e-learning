using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("forum_reports")]
public class ForumReport
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ReportID")]
    public int ReportId { get; set; }

    [Required]
    [Column("ReporterID")]
    public int ReporterId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("TargetType")]
    public string TargetType { get; set; } = "POST"; // POST or COMMENT

    [Column("PostID")]
    public int? PostId { get; set; }

    [Column("CommentID")]
    public int? CommentId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("Reason")]
    public string Reason { get; set; } = "OTHER"; // SPAM, HARASSMENT, INAPPROPRIATE, MISINFORMATION, OTHER

    [MaxLength(500)]
    [Column("Details")]
    public string? Details { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING"; // PENDING, RESOLVED, DISMISSED

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("ResolvedAt")]
    public DateTime? ResolvedAt { get; set; }

    [Column("ResolvedByID")]
    public int? ResolvedById { get; set; }

    // Navigation properties
    [ForeignKey("ReporterId")]
    public virtual User Reporter { get; set; } = null!;

    [ForeignKey("ResolvedById")]
    public virtual User? ResolvedBy { get; set; }

    [ForeignKey("PostId")]
    public virtual ForumPost? Post { get; set; }

    [ForeignKey("CommentId")]
    public virtual ForumComment? Comment { get; set; }
}
