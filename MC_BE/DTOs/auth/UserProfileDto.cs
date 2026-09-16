using System;

namespace MC_BE.DTOs.auth;

public class UserProfileDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? AvatarUrl { get; set; }
    public string RoleName { get; set; } = string.Empty;
    
    // User Profile specific fields
    public string? Bio { get; set; }
    public string? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? ExperienceLevel { get; set; }
    public string? LearningGoal { get; set; }
    public string PreferredLanguage { get; set; } = "en";
}
