using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class SubmitArrangeItemRequest
{
    [Required]
    public int ArrangeItemId { get; set; }

    [Range(1, int.MaxValue)]
    public int SelectedOrder { get; set; }

    public bool IsIncluded { get; set; } = true;
}