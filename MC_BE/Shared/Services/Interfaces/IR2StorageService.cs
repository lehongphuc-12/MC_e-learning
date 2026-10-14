namespace MC_BE.Shared.Services.Interfaces;

/// <summary>
/// Abstraction over Cloudflare R2 (S3-compatible) object storage.
/// Used to upload, delete, and generate accessible URLs for video files.
/// </summary>
public interface IR2StorageService
{
    /// <summary>
    /// Uploads a file stream to R2 and returns the publicly accessible URL.
    /// </summary>
    /// <param name="stream">File content stream.</param>
    /// <param name="fileName">Original file name (used to derive extension).</param>
    /// <param name="contentType">MIME type, e.g. "video/mp4".</param>
    /// <param name="folder">Optional folder/prefix in the bucket (e.g. "lessons/123").</param>
    /// <returns>Public URL of the uploaded object.</returns>
    Task<string> UploadAsync(Stream stream, string fileName, string contentType, string? folder = null);

    /// <summary>
    /// Deletes an object from R2 by its object key.
    /// </summary>
    /// <param name="objectKey">The full key of the object to delete (e.g. "lessons/123/abc.mp4").</param>
    Task DeleteAsync(string objectKey);

    /// <summary>
    /// Extracts the R2 object key from a full public URL.
    /// Returns null if the URL does not belong to this bucket.
    /// </summary>
    string? ExtractKeyFromUrl(string url);

    /// <summary>
    /// Opens a stream for an object stored in R2.
    /// </summary>
    Task<(Stream Stream, string ContentType)?> GetObjectStreamAsync(string objectKey);

    /// <summary>
    /// Generates a signed temporary URL for reading an R2 object.
    /// </summary>
    string GetPresignedUrl(string objectKey, double expiresHours = 24);
}
