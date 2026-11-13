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
}

public class GradeSpeakingSubmissionRequest
{
    [Range(0, 100, ErrorMessage = "Score must be between 0 and 100.")]
    public decimal Score { get; set; }

    public string? Feedback { get; set; }
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

    // Logic Pass/Fail và Xếp loại
    public bool? IsPassed => Score.HasValue ? Score.Value >= 80 : null;
    public string? GradeTier => Score.HasValue ? GetGradeTier(Score.Value) : null;

    public static string GetGradeTier(decimal score)
    {
        if (score >= 95) return "Xuất sắc";
        if (score >= 80) return "Giỏi";
        if (score >= 50) return "Cần cải thiện";
        if (score >= 30) return "Trung bình";
        return "Yếu";
    }
}
