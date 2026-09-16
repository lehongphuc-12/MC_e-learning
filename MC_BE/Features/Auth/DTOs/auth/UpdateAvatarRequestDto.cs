using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace MC_BE.Features.Auth.DTOs.auth;

public class UpdateAvatarRequestDto
{
    [ValidateNever]
    public IFormFile? File { get; set; }

    public string? AvatarUrl { get; set; }
}
