using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("ai_practice_sessions")]
public class AIPracticeSession
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int PracticeSessionId { get; set; }
    public int LearnerId { get; set; }
    public int? CourseId { get; set; }
    public int? LessonId { get; set; }
    [Required, MaxLength(10)]
    public string PracticeMode { get; set; } = "FREE";
    [Required, MaxLength(1000)]
    public string AudioUrl { get; set; } = "";
    [Required, MaxLength(20)]
    public string Status { get; set; } = "PENDING";
    [MaxLength(5000)]
    public string? ExpectedText { get; set; }
    [MaxLength(1000)]
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
