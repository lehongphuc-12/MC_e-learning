using System;
using System.Collections.Generic;

namespace MC_BE.Features.Users.DTOs;

public class UserPreferenceDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public List<string> TargetCategories { get; set; } = new();
    public string? ExperienceLevel { get; set; }
    public List<string> FocusSkills { get; set; } = new();
    public bool IsCompleted { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SaveUserPreferenceRequest
{
    public List<string>? TargetCategories { get; set; }
    public string? ExperienceLevel { get; set; }
    public List<string>? FocusSkills { get; set; }
}
