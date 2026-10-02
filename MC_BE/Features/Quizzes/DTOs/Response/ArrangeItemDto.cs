namespace MC_BE.Features.Quizzes.DTOs;

public class ArrangeItemDto
{
    public int ArrangeItemId { get; set; }
    public int QuestionId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int? CorrectOrder { get; set; }
    public bool IsDistractor { get; set; }
}