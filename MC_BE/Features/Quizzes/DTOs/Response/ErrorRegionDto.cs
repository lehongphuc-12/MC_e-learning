namespace MC_BE.Features.Quizzes.DTOs;

public class ErrorRegionDto
{
    public int ErrorRegionId { get; set; }
    public int QuestionId { get; set; }
    public int StartTimeMs { get; set; }
    public int EndTimeMs { get; set; }
    public string ErrorCategory { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CorrectionText { get; set; }
    public decimal Points { get; set; }
}