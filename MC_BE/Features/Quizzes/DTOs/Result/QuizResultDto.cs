using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class QuizResultDto
{
    public int AttemptId { get; set; }
    public int QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }

    public decimal? Score { get; set; }
    public decimal PassingScore { get; set; }

    public QuizAttemptStatus ResultStatus { get; set; }

    public bool? IsPassed { get; set; }

    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }

    public bool RequiresManualGrading { get; set; }

    public List<QuizAnswerResultDto> Answers { get; set; } = new();
}