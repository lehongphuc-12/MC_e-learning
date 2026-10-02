namespace MC_BE.Features.Quizzes.DTOs;

public class TakeChoiceDto
{
    public int ChoiceId { get; set; }
    public string ChoiceText { get; set; } = string.Empty;
    public string? OptionValue { get; set; }
    public int OrderIndex { get; set; }
}