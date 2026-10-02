namespace MC_BE.Features.Quizzes.DTOs;

public class TakeQuizDto
{
    public int QuizId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public decimal PassingScore { get; set; }
    public int MaxAttempts { get; set; }

    public int AttemptId { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime StartedAt { get; set; }

    public List<TakeQuestionDto> Questions { get; set; } = new();
}