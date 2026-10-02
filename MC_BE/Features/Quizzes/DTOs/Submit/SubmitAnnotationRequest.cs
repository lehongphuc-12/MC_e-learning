using System.ComponentModel.DataAnnotations;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Quizzes.DTOs;

public class SubmitAnnotationRequest
{
    [Required]
    public AnnotationType AnnotationType { get; set; }

    [Range(0, int.MaxValue)]
    public int StartIndex { get; set; }

    [Range(0, int.MaxValue)]
    public int EndIndex { get; set; }

    public string? AnnotationValue { get; set; }
}