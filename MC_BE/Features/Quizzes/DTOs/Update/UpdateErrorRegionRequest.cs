using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Quizzes.DTOs;

public class UpdateErrorRegionRequest
{
    public int ErrorRegionId { get; set; }
    public int StartTimeMs { get; set; }
    public int EndTimeMs { get; set; }

    [Required]
    [MaxLength(100)]
    public string ErrorCategory { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ErrorCode { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? CorrectionText { get; set; }
    public decimal Points { get; set; } = 1.00m;
}