using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class UpdateQuestionRequest
{
    public int QuestionId { get; set; }

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

    public List<UpdateChoiceRequest> Choices { get; set; } = new();
    public List<UpdateQuestionMediaRequest> Media { get; set; } = new();
    public List<UpdateErrorRegionRequest> ErrorRegions { get; set; } = new();
    public List<UpdateAnnotationRequest> Annotations { get; set; } = new();
    public List<UpdateArrangeItemRequest> ArrangeItems { get; set; } = new();
    public UpdateWritingConfigRequest? WritingConfig { get; set; }
    public List<UpdateScenarioNodeRequest> ScenarioNodes { get; set; } = new();
}