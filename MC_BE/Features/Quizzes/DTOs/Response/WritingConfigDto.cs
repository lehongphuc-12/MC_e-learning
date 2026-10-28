namespace MC_BE.Features.Quizzes.DTOs;

public class WritingConfigDto
{
    public int WritingConfigId { get; set; }
    public int QuestionId { get; set; }
    public string? EventType { get; set; }
    public string? Audience { get; set; }
    public string? Style { get; set; }
    public int? MinWords { get; set; }
    public int? MaxWords { get; set; }
    public string? RequiredElementsJson { get; set; }
    public string? GradingRubricJson { get; set; }
}