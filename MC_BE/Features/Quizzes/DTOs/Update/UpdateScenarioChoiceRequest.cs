using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class UpdateScenarioChoiceRequest
{
    public int ScenarioChoiceId { get; set; }

    [Required]
    public string ChoiceText { get; set; } = string.Empty;

    public int? NextNodeId { get; set; }

    [MaxLength(100)]
    public string? NextNodeClientKey { get; set; }

    public decimal Score { get; set; }
    public string? Feedback { get; set; }

    [Range(1, int.MaxValue)]
    public int OrderIndex { get; set; } = 1;
}