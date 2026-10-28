using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class QuizDto
{
    public int QuizId { get; set; }
    public int? CourseId { get; set; }
    public int? LessonId { get; set; }
    public int CreatedById { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public decimal PassingScore { get; set; }
    public int MaxAttempts { get; set; }
    public QuizStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<QuestionDto> Questions { get; set; } = new();
}