using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Features.VoiceAssessment.Entities;

[Table("ai_pronunciation_feedbacks")]
public class AIPronunciationFeedback
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int FeedbackId { get; set; }

    [Required]
    public int SubmissionId { get; set; }

    [Required]
    public int LearnerId { get; set; }

    [Required]
    [MaxLength(50)]
    public string ModelVersion { get; set; } = "V4-B";

    public int CheckpointEpoch { get; set; }

    [Required]
    [MaxLength(100)]
    public string LLMProvider { get; set; } = "OpenAI";

    [Required]
    [MaxLength(100)]
    public string LLMModel { get; set; } = string.Empty;

    [Column(TypeName = "text")]
    public string PredictionJson { get; set; } = "{}";

    [Column(TypeName = "text")]
    public string FeedbackJson { get; set; } = "{}";

    [Column(TypeName = "text")]
    public string Summary { get; set; } = string.Empty;

    [Column(TypeName = "text")]
    public string? ExpectedText { get; set; }

    [Column(TypeName = "text")]
    public string? TranscriptText { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}