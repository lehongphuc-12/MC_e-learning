using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class QuestionDto
{
    public int QuestionId { get; set; }
    public int QuizId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
    public string? Instruction { get; set; }
    public string? Explanation { get; set; }
    public decimal Points { get; set; }
    public bool IsRequired { get; set; }
    public int OrderIndex { get; set; }

    public List<ChoiceDto> Choices { get; set; } = new();
    public List<QuestionMediaDto> Media { get; set; } = new();
    public List<ErrorRegionDto> ErrorRegions { get; set; } = new();
    public List<AnnotationDto> Annotations { get; set; } = new();
    public List<ArrangeItemDto> ArrangeItems { get; set; } = new();
    public WritingConfigDto? WritingConfig { get; set; }
    public List<ScenarioNodeDto> ScenarioNodes { get; set; } = new();
}