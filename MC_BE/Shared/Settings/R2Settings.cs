namespace MC_BE.Shared.Settings;

/// <summary>
/// Configuration settings for Cloudflare R2 (S3-compatible) object storage.
/// Bound from the "CloudflareR2" section of appsettings.json.
/// </summary>
public class R2Settings
{
    /// <summary>Cloudflare Account ID — used to build the endpoint URL.</summary>
    public string AccountId { get; set; } = string.Empty;

    /// <summary>R2 Access Key ID (S3-compatible).</summary>
    public string AccessKey { get; set; } = string.Empty;

    /// <summary>R2 Secret Access Key (S3-compatible).</summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>Target bucket name (e.g. "mseek-videos").</summary>
    public string BucketName { get; set; } = string.Empty;

    /// <summary>
    /// Full S3-compatible endpoint URL for Cloudflare R2.
    /// Example: "https://{accountId}.r2.cloudflarestorage.com"
    /// </summary>
    public string ServiceUrl { get; set; } = string.Empty;

    /// <summary>
    /// Optional: public custom domain for direct CDN delivery.
    /// Example: "https://videos.mseek.io"
    /// Leave empty to use the R2 public URL (or pre-signed URL).
    /// </summary>
    public string? PublicDomain { get; set; }
}
