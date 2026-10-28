using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateQuizRequest
{
    [Required]
    public int CourseId { get; set; }

    public int? LessonId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Range(0, int.MaxValue)]
    public int TimeLimitMinutes { get; set; } = 0;

    [Range(0, 100)]
    public decimal PassingScore { get; set; } = 80.00m;

    [Range(1, int.MaxValue)]
    public int MaxAttempts { get; set; } = 1;

    public QuizStatus Status { get; set; } = QuizStatus.DRAFT;

    [Required]
    [MinLength(1)]
    public List<CreateQuestionRequest> Questions { get; set; } = new();
}