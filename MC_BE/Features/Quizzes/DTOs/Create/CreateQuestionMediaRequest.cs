using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateQuestionMediaRequest
{
    [Required]
    public QuestionMediaType MediaType { get; set; }

    [Required]
    public string MediaUrl { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Label { get; set; }

    [Range(0, int.MaxValue)]
    public int? DurationSeconds { get; set; }

    [Range(1, int.MaxValue)]
    public int OrderIndex { get; set; } = 1;
}