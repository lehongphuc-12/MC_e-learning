namespace MC_BE.Features.Quizzes.DTOs;

public class SelectedChoiceResultDto
{
    public int ChoiceId { get; set; }
    public string ChoiceText { get; set; } = string.Empty;
    public string? OptionValue { get; set; }
    public bool IsCorrect { get; set; }
    public string? Explanation { get; set; }
}