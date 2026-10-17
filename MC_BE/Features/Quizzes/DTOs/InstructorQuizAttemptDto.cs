using MC_BE.Core.Enums;
namespace MC_BE.Features.Quizzes.DTOs;
public class InstructorQuizAttemptDto
{
    public int AttemptId { get; set; }
    public int QuizId { get; set; }
    public int UserId { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public QuizAttemptStatus? ResultStatus { get; set; }
    public decimal? Score { get; set; }
    public int PendingAnswers { get; set; }
}
