namespace MC_BE.Features.Quizzes.DTOs;

public class ErrorRegionResultDto
{
    public int AnswerErrorRegionId { get; set; }
    public int SelectedStartTimeMs { get; set; }
    public int? SelectedEndTimeMs { get; set; }
    public string? SelectedErrorCategory { get; set; }
    public string? SelectedErrorCode { get; set; }

    public int? MatchedErrorRegionId { get; set; }

    public int? CorrectStartTimeMs { get; set; }
    public int? CorrectEndTimeMs { get; set; }
    public string? CorrectErrorCategory { get; set; }
    public string? CorrectErrorCode { get; set; }

    public decimal LocationScore { get; set; }
    public decimal TypeScore { get; set; }
}