using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class AnnotationDto
{
    public int AnnotationId { get; set; }
    public int QuestionId { get; set; }
    public AnnotationType AnnotationType { get; set; }
    public int StartIndex { get; set; }
    public int EndIndex { get; set; }
    public string? AnnotationValue { get; set; }
    public string? Explanation { get; set; }
    public decimal Points { get; set; }
}