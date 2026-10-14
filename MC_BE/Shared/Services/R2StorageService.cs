using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.Extensions.Options;

namespace MC_BE.Shared.Services;

/// <summary>
/// Cloudflare R2 implementation of <see cref="IR2StorageService"/>.
/// Uses the AWS SDK for .NET with a custom S3-compatible endpoint.
///
/// IMPORTANT COMPATIBILITY NOTES FOR CLOUDFLARE R2:
/// 1. R2 does NOT support S3 ACLs — public access must be enabled at bucket level
///    in the Cloudflare Dashboard.
/// 2. R2 does NOT support AWS chunked/streaming upload
///    (STREAMING-AWS4-HMAC-SHA256-PAYLOAD-TRAILER).
///    Fix: DisablePayloadSigning=true + UseChunkEncoding=false.
/// 3. AuthenticationRegion must be "auto" for R2.
/// </summary>
public class R2StorageService : IR2StorageService
{
    private readonly IAmazonS3 _s3;
    private readonly R2Settings _settings;

    public R2StorageService(IOptions<R2Settings> options)
    {
        _settings = options.Value;

        var credentials = new BasicAWSCredentials(_settings.AccessKey, _settings.SecretKey);

        var config = new AmazonS3Config
        {
            ServiceURL        = _settings.ServiceUrl,
            // Path-style addressing is required for custom S3-compatible endpoints
            ForcePathStyle    = true,
            // R2 uses "auto" as its signing region
            AuthenticationRegion = "auto",
        };

        _s3 = new AmazonS3Client(credentials, config);
    }

    /// <inheritdoc />
    public async Task<string> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        string? folder = null)
    {
        var ext = Path.GetExtension(fileName);
        var uniqueKey = string.IsNullOrWhiteSpace(folder)
            ? $"{Guid.NewGuid()}{ext}"
            : $"{folder.Trim('/')}/{Guid.NewGuid()}{ext}";

        var request = new PutObjectRequest
        {
            BucketName  = _settings.BucketName,
            Key         = uniqueKey,
            InputStream = stream,
            ContentType = contentType,
            // CRITICAL: Must disable chunk encoding — R2 only accepts
            // standard (non-chunked) PUT requests.
            UseChunkEncoding = false,
            // NOTE: Cloudflare R2 does NOT support S3 ACLs.
            // Enable public access at bucket level in the Cloudflare Dashboard.
        };

        await _s3.PutObjectAsync(request);

        return BuildPublicUrl(uniqueKey);
    }

    /// <inheritdoc />
    public async Task DeleteAsync(string objectKey)
    {
        var request = new DeleteObjectRequest
        {
            BucketName = _settings.BucketName,
            Key        = objectKey,
        };

        await _s3.DeleteObjectAsync(request);
    }

    /// <inheritdoc />
    public string? ExtractKeyFromUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;

        // Try to extract from public domain first
        if (!string.IsNullOrWhiteSpace(_settings.PublicDomain))
        {
            var domain = _settings.PublicDomain.TrimEnd('/');
            if (url.StartsWith(domain, StringComparison.OrdinalIgnoreCase))
                return url.Substring(domain.Length).TrimStart('/');
        }

        // Otherwise try the R2 ServiceUrl/{BucketName}/ pattern
        var prefix = $"{_settings.ServiceUrl.TrimEnd('/')}/{_settings.BucketName}/";
        if (url.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return url.Substring(prefix.Length);

        return null;
    }

    /// <inheritdoc />
    public async Task<(Stream Stream, string ContentType)?> GetObjectStreamAsync(string objectKey)
    {
        try
        {
            var response = await _s3.GetObjectAsync(_settings.BucketName, objectKey);
            return (response.ResponseStream, response.Headers.ContentType ?? "video/mp4");
        }
        catch
        {
            return null;
        }
    }

    /// <inheritdoc />
    public string GetPresignedUrl(string objectKey, double expiresHours = 24)
    {
        try
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _settings.BucketName,
                Key        = objectKey,
                Expires    = DateTime.UtcNow.AddHours(expiresHours),
            };
            return _s3.GetPreSignedURL(request);
        }
        catch
        {
            return $"{_settings.ServiceUrl.TrimEnd('/')}/{_settings.BucketName}/{objectKey}";
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private string BuildPublicUrl(string objectKey)
    {
        // Prefer a custom public domain (CDN) if configured
        if (!string.IsNullOrWhiteSpace(_settings.PublicDomain))
            return $"{_settings.PublicDomain.TrimEnd('/')}/{objectKey}";

        // If no public domain is specified, generate a presigned URL valid for 24h
        // to avoid 403 Forbidden errors when browsers load direct S3 URLs
        return GetPresignedUrl(objectKey, 24);
    }
}
