namespace MC_BE.Features.Quizzes.DTOs;

public class ScenarioChoiceDto
{
    public int ScenarioChoiceId { get; set; }
    public int NodeId { get; set; }
    public string ChoiceText { get; set; } = string.Empty;
    public int? NextNodeId { get; set; }
    public decimal Score { get; set; }
    public string? Feedback { get; set; }
    public int OrderIndex { get; set; }
}