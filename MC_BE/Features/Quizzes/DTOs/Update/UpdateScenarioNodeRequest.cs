using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class UpdateScenarioNodeRequest
{
    public int NodeId { get; set; }

    [Required]
    [MaxLength(100)]
    public string ClientKey { get; set; } = string.Empty;

    public ScenarioNodeType NodeType { get; set; }
    public string? Title { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? MediaUrl { get; set; }
    public bool IsStartNode { get; set; }
    public bool IsEndNode { get; set; }
    public decimal? Points { get; set; }

    public List<UpdateScenarioChoiceRequest> Choices { get; set; } = new();
}