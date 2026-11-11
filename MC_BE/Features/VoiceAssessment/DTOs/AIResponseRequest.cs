using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.VoiceAssessment.DTOs;

public class AIResponseRequest
{
    [MaxLength(5000)]
    public string? ExpectedText { get; set; }

    [MaxLength(10000)]
    public string? TranscriptText { get; set; }
}