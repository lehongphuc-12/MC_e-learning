using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateQuestionRequest
{
    [Required]
    public string QuestionText { get; set; } = string.Empty;

    [Required]
    public QuestionType QuestionType { get; set; }

    public string? Instruction { get; set; }

    public string? Explanation { get; set; }

    [Range(0.01, 10000)]
    public decimal Points { get; set; } = 1.00m;

    public bool IsRequired { get; set; } = true;

    [Range(1, int.MaxValue)]
    public int OrderIndex { get; set; } = 1;

    public List<CreateChoiceRequest> Choices { get; set; } = new();
    public List<CreateQuestionMediaRequest> Media { get; set; } = new();
    public List<CreateErrorRegionRequest> ErrorRegions { get; set; } = new();
    public List<CreateAnnotationRequest> Annotations { get; set; } = new();
    public List<CreateArrangeItemRequest> ArrangeItems { get; set; } = new();
    public CreateWritingConfigRequest? WritingConfig { get; set; }
    public List<CreateScenarioNodeRequest> ScenarioNodes { get; set; } = new();
}
