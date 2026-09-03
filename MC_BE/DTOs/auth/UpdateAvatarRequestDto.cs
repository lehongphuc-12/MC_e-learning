using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.DTOs.auth;

public class UpdateAvatarRequestDto
{
    [Required(ErrorMessage = "Avatar image file is required.")]
    public IFormFile File { get; set; } = null!;
}
