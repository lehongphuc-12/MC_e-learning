using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class ManualGradeQuizAnswerRequest
{
    [Range(typeof(decimal), "0", "999999999")]
    public decimal Score { get; set; }
    [MaxLength(5000)]
    public string? TeacherFeedback { get; set; }
}
