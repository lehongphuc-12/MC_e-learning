using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class UpdateQuizRequest
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(0, int.MaxValue)]
    public int TimeLimitMinutes { get; set; }

    [Range(0, 100)]
    public decimal PassingScore { get; set; }

    [Range(1, int.MaxValue)]
    public int MaxAttempts { get; set; }

    public QuizStatus Status { get; set; }

    [Required]
    [MinLength(1)]
    public List<UpdateQuestionRequest> Questions { get; set; } = new();
}