using System;
namespace MC_BE.Core.DTOs;
public class CourseEnrolledStudentDto
{
    public int EnrollmentId { get; set; }
    public int CourseId { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime? EnrolledAt { get; set; }
    public string EnrollmentStatus { get; set; } = string.Empty;
    public decimal CompletionPercentage { get; set; }
}
