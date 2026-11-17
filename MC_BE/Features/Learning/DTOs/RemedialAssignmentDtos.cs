using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Learning.DTOs;

public sealed class CreateRemedialAssignmentRequest
{
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(1000)] public string Reason { get; set; } = string.Empty;
    public int? LessonId { get; set; }
    public int? QuizId { get; set; }
    public int? SpeakingScriptId { get; set; }
    public int? TargetQuizId { get; set; }
    public int? TargetSpeakingScriptId { get; set; }
    [Range(1, 20)] public int MaxAttempts { get; set; } = 3;
    public DateTime? DueAt { get; set; }
    [Required, MinLength(1)] public List<int> StudentIds { get; set; } = new();
}

public sealed class RemedialAssignmentDto
{
    public int RemedialAssignmentId { get; set; }
    public int CourseId { get; set; }
    public int StudentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int ContentId { get; set; }
    public string ContentTitle { get; set; } = string.Empty;
    public int? TargetAssessmentId { get; set; }
    public string? TargetAssessmentType { get; set; }
    public int MaxAttempts { get; set; }
    public bool IsActive { get; set; }
    public DateTime? DueAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int AttemptsUsed { get; set; }
    public string? AssignedByName { get; set; }
}

public sealed class RemedialAssignmentEventDto
{
    public long EventId { get; set; }
    public int? StudentId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
    public string ActorName { get; set; } = string.Empty;
}
