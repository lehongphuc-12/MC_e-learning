namespace MC_BE.Features.Admin.DTOs;

public class AdminUserDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string JoinedDate { get; set; } = string.Empty;
    public string? LastActive { get; set; }
    public int CoursesEnrolled { get; set; } = 0;
    public int CoursesCreated { get; set; } = 0;
}

public class UpdateUserStatusRequest
{
    /// <summary>"ACTIVE" hoặc "INACTIVE"</summary>
    public string Status { get; set; } = string.Empty;
}

public class AdminUpdateUserRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    /// <summary>"student", "instructor", hoặc "admin"</summary>
    public string Role { get; set; } = string.Empty;
    /// <summary>"active" hoặc "locked"</summary>
    public string Status { get; set; } = string.Empty;
}

