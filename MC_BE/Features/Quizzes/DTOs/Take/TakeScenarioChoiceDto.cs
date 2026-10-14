namespace MC_BE.Features.Quizzes.DTOs;

public class TakeScenarioChoiceDto
{
    public int ScenarioChoiceId { get; set; }
    public int NodeId { get; set; }
    public string ChoiceText { get; set; } = string.Empty;
    public int? NextNodeId { get; set; }
    public int OrderIndex { get; set; }
}