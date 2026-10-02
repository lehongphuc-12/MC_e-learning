using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class CreateArrangeItemRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int? CorrectOrder { get; set; }

    public bool IsDistractor { get; set; }
}