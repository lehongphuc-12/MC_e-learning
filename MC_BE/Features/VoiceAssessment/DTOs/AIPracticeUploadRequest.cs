using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
namespace MC_BE.Features.VoiceAssessment.DTOs;
public sealed class AIPracticeUploadRequest
{
    [Required] public IFormFile AudioFile { get; set; } = null!;
    [MaxLength(5000)] public string? ExpectedText { get; set; }
}
