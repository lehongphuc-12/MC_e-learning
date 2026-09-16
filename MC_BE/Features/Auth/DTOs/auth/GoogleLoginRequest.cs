using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Auth.DTOs.auth;

public class GoogleLoginRequest
{
    [Required]
    public string IdToken { get; set; } = string.Empty;
}
