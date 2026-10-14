using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateChoiceRequest
{
    [Required]
    public string ChoiceText { get; set; } = string.Empty;

    public string? OptionValue { get; set; }

    public bool IsCorrect { get; set; }

    public string? Explanation { get; set; }

    [Range(1, int.MaxValue)]
    public int OrderIndex { get; set; } = 1;
}