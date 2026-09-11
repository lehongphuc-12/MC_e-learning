using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Auth.DTOs.auth;

public class ForgotPasswordRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
