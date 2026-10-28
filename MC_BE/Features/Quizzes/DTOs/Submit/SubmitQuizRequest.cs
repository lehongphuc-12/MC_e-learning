using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class SubmitQuizRequest
{
    [Required]
    public int AttemptId { get; set; }

    [Required]
    public List<SubmitQuizAnswerRequest> Answers { get; set; } = new();
}