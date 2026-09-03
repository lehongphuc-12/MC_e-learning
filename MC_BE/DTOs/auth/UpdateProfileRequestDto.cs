using System.ComponentModel.DataAnnotations;

namespace MC_BE.DTOs.auth;

public class UpdateProfileRequestDto
{
    [StringLength(100, ErrorMessage = "Full name cannot exceed 100 characters")]
    public string? FullName { get; set; }

    [Phone(ErrorMessage = "Invalid phone number")]
    [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
    public string? PhoneNumber { get; set; }

    public string? Bio { get; set; }

    [StringLength(10, ErrorMessage = "Gender cannot exceed 10 characters")]
    public string? Gender { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [StringLength(50, ErrorMessage = "Experience level cannot exceed 50 characters")]
    public string? ExperienceLevel { get; set; }

    public string? LearningGoal { get; set; }

    [StringLength(10, ErrorMessage = "Preferred language cannot exceed 10 characters")]
    public string? PreferredLanguage { get; set; }
}
