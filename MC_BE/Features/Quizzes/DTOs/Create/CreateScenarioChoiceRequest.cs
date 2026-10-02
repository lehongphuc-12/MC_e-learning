using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateScenarioChoiceRequest
{
    [Required]
    public string ChoiceText { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? NextNodeClientKey { get; set; }

    public decimal Score { get; set; }

    public string? Feedback { get; set; }

    [Range(1, int.MaxValue)]
    public int OrderIndex { get; set; } = 1;
}