using System;

namespace MC_BE.Core.DTOs;

public class EnrollmentDto
{
    public int EnrollmentId { get; set; }
    public int LearnerId { get; set; }
    public int CourseId { get; set; }
    public int? PaymentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal CompletionPercentage { get; set; }
    public DateTime? EnrolledAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RevokeEnrollmentRequest
{
    public string Reason { get; set; } = string.Empty;
    public bool IsRefunded { get; set; }
}