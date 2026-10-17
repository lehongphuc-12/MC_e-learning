
using CloudinaryDotNet.Actions;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Quizzes.Controllers;

[ApiController]
[Route("api/quizzes/media")]
[Authorize(Roles = "Instructor")]
public class QuizMediaUploadController : ControllerBase
{
    private readonly ICloudinaryService _cloudinary;

    public QuizMediaUploadController(ICloudinaryService cloudinary)
    {
        _cloudinary = cloudinary;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(110_000_000)]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile? file,
        [FromForm] string? mediaType)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file." });

        var type = mediaType?.Trim().ToUpperInvariant();
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

        var valid = type switch
        {
            "IMAGE" => new[] { ".jpg", ".jpeg", ".png", ".webp" }.Contains(ext)
                && file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase),

            "AUDIO" => new[] { ".mp3", ".wav", ".m4a", ".ogg" }.Contains(ext)
                && (file.ContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase)
                    || file.ContentType == "application/ogg"),

            "VIDEO" => new[] { ".mp4", ".webm", ".mov" }.Contains(ext)
                && file.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase),

            _ => false
        };

        if (!valid)
            return BadRequest(new { message = "Định dạng media không hợp lệ." });

        long max = type == "IMAGE"
            ? 10L * 1024 * 1024
            : type == "AUDIO"
                ? 25L * 1024 * 1024
                : 100L * 1024 * 1024;

        if (file.Length > max)
            return BadRequest(new { message = "File vượt quá dung lượng cho phép." });

        try
        {
            // Cloudinary lưu audio dưới resource_type=video để hỗ trợ phát media.
            var result = type == "IMAGE"
                ? (UploadResult)await _cloudinary.UploadImageAsync(file, "mseek/quiz/images")
                : await _cloudinary.UploadVideoAsync(
                    file,
                    type == "AUDIO" ? "mseek/quiz/audio" : "mseek/quiz/videos"
                );

            if (result.Error != null || result.SecureUrl == null)
                return StatusCode(502, new { message = "Cloudinary upload thất bại." });

            return Ok(new
            {
                mediaUrl = result.SecureUrl.ToString(),
                mediaType = type,
                publicId = result.PublicId
            });
        }
        catch (Exception)
        {
            return StatusCode(502, new { message = "Không thể tải file lên Cloudinary." });
        }
    }
}
