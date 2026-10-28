using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class SubmitErrorRegionRequest
{
    [Range(0, int.MaxValue)]
    public int SelectedStartTimeMs { get; set; }

    [Range(0, int.MaxValue)]
    public int? SelectedEndTimeMs { get; set; }

    [MaxLength(100)]
    public string? SelectedErrorCategory { get; set; }

    [MaxLength(100)]
    public string? SelectedErrorCode { get; set; }
}