using System.Text.RegularExpressions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;

namespace MC_BE.Features.Courses.Services;

/// <summary>
/// Picks the playable lesson video URL from course materials.
/// Excel/CSV import historically stored Drive links as MaterialType.OTHER,
/// while the lesson API only read MaterialType.VIDEO — this resolver unifies both.
/// Google Drive /view links cannot be used in a player; they are rewritten to /preview.
/// </summary>
public static class LessonVideoUrlResolver
{
    private static readonly Regex DriveFileIdRegex = new(
        @"[?&]id=([a-zA-Z0-9_-]+)|(?:drive|docs)\.google\.com/(?:file/d/|open\?id=)([a-zA-Z0-9_-]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static string? Resolve(IEnumerable<CourseMaterial>? materials)
    {
        if (materials is null)
            return null;

        var list = materials
            .Where(m => !string.IsNullOrWhiteSpace(m.FileUrl))
            .ToList();

        if (list.Count == 0)
            return null;

        var preferred = list.FirstOrDefault(m => m.MaterialType == MaterialType.VIDEO)
            ?? list.FirstOrDefault(m => IsExternalVideoUrl(m.FileUrl))
            ?? list.FirstOrDefault(m => m.MaterialType is MaterialType.OTHER or MaterialType.LINK);

        return preferred is null ? null : NormalizeStoredUrl(preferred.FileUrl);
    }

    public static string NormalizeStoredUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return string.Empty;

        var trimmed = url.Trim();
        var fileId = TryExtractGoogleDriveFileId(trimmed);
        if (fileId is null)
            return trimmed;

        return $"https://drive.google.com/file/d/{fileId}/preview";
    }

    private static bool IsExternalVideoUrl(string url)
    {
        return url.Contains("youtube.com", StringComparison.OrdinalIgnoreCase)
            || url.Contains("youtu.be", StringComparison.OrdinalIgnoreCase)
            || url.Contains("vimeo.com", StringComparison.OrdinalIgnoreCase)
            || url.Contains("drive.google.com", StringComparison.OrdinalIgnoreCase)
            || url.Contains("docs.google.com/file", StringComparison.OrdinalIgnoreCase);
    }

    private static string? TryExtractGoogleDriveFileId(string url)
    {
        if (!url.Contains("drive.google.com", StringComparison.OrdinalIgnoreCase)
            && !url.Contains("docs.google.com/file", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var match = DriveFileIdRegex.Match(url);
        if (!match.Success)
            return null;

        var id = match.Groups[1].Success && match.Groups[1].Length > 0
            ? match.Groups[1].Value
            : match.Groups[2].Value;

        return string.IsNullOrWhiteSpace(id) ? null : id;
    }
}
