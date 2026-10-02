using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class TakeQuestionDto
{
    public int QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
    public string? Instruction { get; set; }
    public decimal Points { get; set; }
    public bool IsRequired { get; set; }
    public int OrderIndex { get; set; }

    public List<TakeChoiceDto> Choices { get; set; } = new();
    public List<TakeQuestionMediaDto> Media { get; set; } = new();
    public List<TakeArrangeItemDto> ArrangeItems { get; set; } = new();
    public TakeWritingConfigDto? WritingConfig { get; set; }
    public List<TakeScenarioNodeDto> ScenarioNodes { get; set; } = new();
}