using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class UpdateArrangeItemRequest
{
    public int ArrangeItemId { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public int? CorrectOrder { get; set; }
    public bool IsDistractor { get; set; }
}