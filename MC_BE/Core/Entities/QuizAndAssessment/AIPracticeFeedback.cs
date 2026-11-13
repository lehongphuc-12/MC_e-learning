using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

// Bảng RIÊNG: không sửa AIPronunciationFeedback / SubmissionId hiện có.
[Table("ai_practice_feedbacks")]
public class AIPracticeFeedback
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int PracticeFeedbackId { get; set; }
    public int PracticeSessionId { get; set; }
    public int LearnerId { get; set; }
    [Required, MaxLength(50)]
    public string ModelVersion { get; set; } = "V4-B";
    public int CheckpointEpoch { get; set; }
    [Required, MaxLength(100)]
    public string LLMProvider { get; set; } = "STU AI Portal";
    [Required, MaxLength(100)]
    public string LLMModel { get; set; } = "";
    [Column(TypeName = "text")]
    public string PredictionJson { get; set; } = "{}";
    [Column(TypeName = "text")]
    public string FeedbackJson { get; set; } = "{}";
    [Column(TypeName = "text")]
    public string Summary { get; set; } = "";
    [Column(TypeName = "text")]
    public string? ExpectedText { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
