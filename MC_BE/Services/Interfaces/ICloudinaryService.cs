using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Services.Interfaces;

public interface ICloudinaryService
{
    Task<ImageUploadResult> UploadImageAsync(IFormFile file, string? folder = null);
    Task<VideoUploadResult> UploadVideoAsync(IFormFile file, string? folder = null);
    Task<RawUploadResult> UploadRawFileAsync(IFormFile file, string? folder = null);
    Task<DeletionResult> DeleteFileAsync(string publicId, ResourceType resourceType = ResourceType.Image);
}
