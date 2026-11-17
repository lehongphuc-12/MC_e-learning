namespace MC_BE.Core.DTOs;

public sealed class CourseStudentInsightDto
{
    public int EnrollmentId { get; set; }
    public int CourseId { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime? EnrolledAt { get; set; }
    public decimal CompletionPercentage { get; set; }
    public int PassedAssessmentCount { get; set; }
    public int AssessmentCount { get; set; }
    public int FailedAssessmentCount { get; set; }
    public int OverdueAssessmentCount { get; set; }
    public int PendingGradeCount { get; set; }
    public string RiskStatus { get; set; } = "INSUFFICIENT_DATA";
    public List<string> RiskReasons { get; set; } = new();
    public DateTime? LastActivityAt { get; set; }
    public List<StudentAssessmentInsightDto> Assessments { get; set; } = new();
}

public sealed class StudentAssessmentInsightDto
{
    public string AssessmentType { get; set; } = string.Empty;
    public int AssessmentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal? BestScore { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? DueAt { get; set; }
    public DateTime? LastSubmittedAt { get; set; }
    public int AttemptCount { get; set; }
}
