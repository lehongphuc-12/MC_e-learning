namespace MC_BE.Features.Quizzes.DTOs;

public class ScenarioPathResultDto
{
    public int StepOrder { get; set; }
    public int NodeId { get; set; }
    public string NodeContent { get; set; } = string.Empty;

    public int ScenarioChoiceId { get; set; }
    public string ChoiceText { get; set; } = string.Empty;

    public decimal Score { get; set; }
    public string? Feedback { get; set; }
}