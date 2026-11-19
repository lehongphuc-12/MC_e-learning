using System;
using System.Collections.Generic;

namespace MC_BE.Features.Learning.DTOs;

public class CourseLearningProgressDto
{
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public int EnrollmentId { get; set; }
    public decimal CompletionPercentage { get; set; }
    public bool IsCompleted { get; set; }
    public int CompletedLessonsCount { get; set; }
    public int TotalLessonsCount { get; set; }
    public int? CertificateId { get; set; }
    public string? CertificateCode { get; set; }
    public List<LessonProgressDto> LessonProgresses { get; set; } = new();
}

public class LessonProgressDto
{
    public int LessonId { get; set; }
    public bool IsCompleted { get; set; }
    public int LastPositionSeconds { get; set; }
    public int TimeSpentSeconds { get; set; }
    public int TimeSpentMinutes { get; set; }
    public DateTime? LastAccessedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class UpdateLessonProgressRequest
{
    public bool? IsCompleted { get; set; }
    public int? LastPositionSeconds { get; set; }
    public int? TimeSpentSeconds { get; set; }
}
