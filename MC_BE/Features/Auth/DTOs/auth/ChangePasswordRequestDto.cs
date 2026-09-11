using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Auth.DTOs.auth;

public class ChangePasswordRequestDto
{
    public string? OldPassword { get; set; }

    [Required(ErrorMessage = "New password is required.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "New password must be at least 6 characters long.")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Confirm password is required.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Confirm password must be at least 6 characters long.")]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
