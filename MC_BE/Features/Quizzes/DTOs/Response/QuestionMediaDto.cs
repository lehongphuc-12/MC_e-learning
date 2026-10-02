using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class QuestionMediaDto
{
    public int MediaId { get; set; }
    public int QuestionId { get; set; }
    public QuestionMediaType MediaType { get; set; }
    public string MediaUrl { get; set; } = string.Empty;
    public string? Label { get; set; }
    public int? DurationSeconds { get; set; }
    public int OrderIndex { get; set; }
}