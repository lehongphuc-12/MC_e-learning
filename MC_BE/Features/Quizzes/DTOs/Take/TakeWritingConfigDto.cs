namespace MC_BE.Features.Quizzes.DTOs;

public class TakeWritingConfigDto
{
    public string? EventType { get; set; }
    public string? Audience { get; set; }
    public string? Style { get; set; }
    public int? MinWords { get; set; }
    public int? MaxWords { get; set; }
    public string? RequiredElementsJson { get; set; }
}