using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class QuizResultDto
{
    public int AttemptId { get; set; }
    public int QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public int? RecommendedLessonId { get; set; }
    public List<RecommendedLessonDto> RecommendedLessons { get; set; } = new();
    public DateTime? RetryAvailableAt { get; set; }
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

public class RecommendedLessonDto
{
    public int LessonId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
}
