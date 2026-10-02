using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class TakeScenarioNodeDto
{
    public int NodeId { get; set; }
    public ScenarioNodeType NodeType { get; set; }
    public string? Title { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public bool IsStartNode { get; set; }
    public bool IsEndNode { get; set; }

    public List<TakeScenarioChoiceDto> Choices { get; set; } = new();
}