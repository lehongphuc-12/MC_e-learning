
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

public class CreateSpeakingSubmissionRequest
{

    public int? LessonId { get; set; }

    public int? ScriptId { get; set; }

    [Required(ErrorMessage = "Audio file (.mp3 or .wav) is required.")]
    public IFormFile AudioFile { get; set; } = null!;

    public string? Note { get; set; }

    public string? SelectedLevel { get; set; }
}

public class GradeSpeakingSubmissionRequest
{

    [Range(0, 100, ErrorMessage = "Score must be between 0 and 100.")]
    public decimal Score { get; set; }

    public string? Feedback { get; set; }

    public List<CriterionScoreDto>? CriterionScores { get; set; }
}

public class CriterionScoreDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal WeightPercentage { get; set; }
    public decimal Score { get; set; }
    public string? Feedback { get; set; }
}

public class SubmissionCriterionScoreDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal WeightPercentage { get; set; }
    public decimal Score { get; set; }
    public string? Feedback { get; set; }
}

public class SpeakingSubmissionHistoryDto
{
    public int SubmissionId { get; set; }
    public int? ScriptId { get; set; }
    public int? LessonId { get; set; }
    public int AttemptNumber { get; set; }
    public decimal? Score { get; set; }
    public string Status { get; set; } = string.Empty;
    private bool? _isPassed;
    public bool? IsPassed
    {
        get => _isPassed ?? (Score.HasValue ? (Status != "NEEDS_RESUBMISSION" && Score.Value >= 80) : null);
        set => _isPassed = value;
    }
    private string? _gradeTier;
    public string? GradeTier
    {
        get => _gradeTier ?? (Score.HasValue
            ? (IsPassed == false
                ? (Score.Value >= 80 ? "Chưa đạt (Điểm liệt tiêu chí)" : SpeakingSubmissionResponseDto.GetGradeTier(Score.Value))
                : SpeakingSubmissionResponseDto.GetGradeTier(Score.Value))
            : null);
        set => _gradeTier = value;
    }
    public DateTime SubmittedAt { get; set; }
    public DateTime? GradedAt { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public string? SelectedLevel { get; set; }
}

public class SpeakingSubmissionResponseDto
{

    public int SubmissionId { get; set; }

    public int? ScriptId { get; set; }

    public string? ScriptTitle { get; set; }

    public string Scope { get; set; } = "FINAL";

    public int? LessonId { get; set; }

    public string LessonTitle { get; set; } = string.Empty;

    public int CourseId { get; set; }

    public string CourseTitle { get; set; } = string.Empty;

    public string? CourseSlug { get; set; }

    public int? ModuleId { get; set; }

    public string? ModuleTitle { get; set; }

    public int LearnerId { get; set; }

    public string LearnerName { get; set; } = string.Empty;

    public string LearnerEmail { get; set; } = string.Empty;

    public int InstructorId { get; set; }

    public string InstructorName { get; set; } = string.Empty;

    public string AudioUrl { get; set; } = string.Empty;

    public string? Note { get; set; }

    public string Status { get; set; } = string.Empty;

    public decimal? Score { get; set; }

    public string? Feedback { get; set; }

    public int? GradedById { get; set; }

    public string? GradedByName { get; set; }

    public DateTime? GradedAt { get; set; }

    public DateTime SubmittedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? SelectedLevel { get; set; }

    public int AttemptNumber { get; set; } = 1;

    public int TotalAttempts { get; set; } = 1;

    public decimal PassingScore { get; set; } = 80m;

    public List<SpeakingRubricCriterionDto> RubricCriteria { get; set; } = new();

    public List<SubmissionCriterionScoreDto> CriterionScores { get; set; } = new();

    public bool? IsPassed
    {
        get
        {
            if (!Score.HasValue) return null;
            if (Status == "NEEDS_RESUBMISSION") return false;
            if (Score.Value < 80) return false;
            if (CriterionScores != null && CriterionScores.Count > 0 && CriterionScores.Any(c => c.Score <= 0))
                return false;
            return true;
        }
    }

    public string? GradeTier
    {
        get
        {
            if (!Score.HasValue) return null;
            if (IsPassed == false)
            {
                if (CriterionScores != null && CriterionScores.Any(c => c.Score <= 0))
                    return "Chưa đạt (Điểm liệt tiêu chí)";
                if (Score.Value >= 80)
                    return "Chưa đạt (Điểm liệt tiêu chí)";
                return GetGradeTier(Score.Value);
            }
            return GetGradeTier(Score.Value);
        }
    }

    public static string GetGradeTier(decimal score)
    {

        if (score >= 95) return "Xuất sắc";

        if (score >= 80) return "Giỏi";

        if (score >= 50) return "Cần cải thiện";

        if (score >= 30) return "Trung bình";

        return "Yếu";
    }
}
