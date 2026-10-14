using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class AnnotationResultDto
{
    public int AnswerAnnotationId { get; set; }

    public AnnotationType AnnotationType { get; set; }

    public int StartIndex { get; set; }
    public int EndIndex { get; set; }
    public string? AnnotationValue { get; set; }

    public int? MatchedAnnotationId { get; set; }

    public int? CorrectStartIndex { get; set; }
    public int? CorrectEndIndex { get; set; }
    public string? CorrectAnnotationValue { get; set; }

    public decimal Score { get; set; }
}