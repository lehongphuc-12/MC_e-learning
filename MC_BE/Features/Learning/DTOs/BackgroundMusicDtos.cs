using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.DTOs;

public class BackgroundMusicDto
{
    public int MusicId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AudioUrl { get; set; } = string.Empty;
    public bool IsSystemDefault { get; set; }
    public int? LessonId { get; set; }
}

public class UploadBackgroundMusicRequest
{
    [Required(ErrorMessage = "Tiêu đề bản nhạc không được để trống.")]
    [MaxLength(200, ErrorMessage = "Tiêu đề không được vượt quá 200 ký tự.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng chọn tập tin âm thanh (.mp3, .wav, .ogg).")]
    public IFormFile File { get; set; } = null!;
}

public class PreUploadMusicResultDto
{
    public string Title { get; set; } = string.Empty;
    public string AudioUrl { get; set; } = string.Empty;
    public string CloudinaryPublicId { get; set; } = string.Empty;
}

public class LinkBackgroundMusicItem
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string AudioUrl { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? CloudinaryPublicId { get; set; }
}

public class LinkBackgroundMusicsRequest
{
    [Required]
    public List<LinkBackgroundMusicItem> Musics { get; set; } = new();
}
