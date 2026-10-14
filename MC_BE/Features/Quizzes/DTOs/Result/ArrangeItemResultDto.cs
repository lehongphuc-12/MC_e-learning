namespace MC_BE.Features.Quizzes.DTOs;

public class ArrangeItemResultDto
{
    public int ArrangeItemId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int? SelectedOrder { get; set; }
    public int? CorrectOrder { get; set; }
    public bool IsIncluded { get; set; }
    public bool IsDistractor { get; set; }
    public bool IsCorrect { get; set; }
}