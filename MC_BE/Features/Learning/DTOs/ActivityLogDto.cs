using System;

namespace MC_BE.Features.Learning.DTOs;

public class ActivityLogDto
{
    public string Emoji { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string Accent { get; set; } = string.Empty;
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; }
}
