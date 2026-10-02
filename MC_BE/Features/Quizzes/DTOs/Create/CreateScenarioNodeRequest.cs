using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateScenarioNodeRequest
{
    [Required]
    [MaxLength(100)]
    public string ClientKey { get; set; } = string.Empty;

    [Required]
    public ScenarioNodeType NodeType { get; set; }

    [MaxLength(255)]
    public string? Title { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? MediaUrl { get; set; }

    public bool IsStartNode { get; set; }

    public bool IsEndNode { get; set; }

    [Range(0, 10000)]
    public decimal? Points { get; set; }

    public List<CreateScenarioChoiceRequest> Choices { get; set; } = new();
}