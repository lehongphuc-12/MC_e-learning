using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateWritingConfigRequest
{
    [MaxLength(255)]
    public string? EventType { get; set; }

    [MaxLength(255)]
    public string? Audience { get; set; }

    [MaxLength(255)]
    public string? Style { get; set; }

    [Range(0, int.MaxValue)]
    public int? MinWords { get; set; }

    [Range(1, int.MaxValue)]
    public int? MaxWords { get; set; }

    public string? RequiredElementsJson { get; set; }

    public string? GradingRubricJson { get; set; }
}