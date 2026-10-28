namespace MC_BE.Features.Quizzes.DTOs;

public class ChoiceDto
{
    public int ChoiceId { get; set; }
    public int QuestionId { get; set; }
    public string ChoiceText { get; set; } = string.Empty;
    public string? OptionValue { get; set; }
    public bool IsCorrect { get; set; }
    public string? Explanation { get; set; }
    public int OrderIndex { get; set; }
}