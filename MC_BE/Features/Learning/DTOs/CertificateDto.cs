using System;

namespace MC_BE.Features.Learning.DTOs;

public class CertificateDto
{
    public int CertificateId { get; set; }
    public int EnrollmentId { get; set; }
    public int LearnerId { get; set; }
    public string LearnerName { get; set; } = string.Empty;
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public string InstructorName { get; set; } = string.Empty;
    public string CertificateCode { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public decimal CompletionPercentage { get; set; }
    public string? Grade { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public string? CertificateUrl { get; set; }
}

public class CertificateVerificationDto
{
    public string CertificateCode { get; set; } = string.Empty;
    public string LearnerName { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public bool IsValid { get; set; }
    public string Status { get; set; } = "ACTIVE";
}
