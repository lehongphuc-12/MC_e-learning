using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using MC_BE.Shared.Settings;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Features.Auth.Services.Interfaces;
using MC_BE.Features.Admin.Services.Interfaces;
using MC_BE.Features.Users.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace MC_BE.Shared.Services;

public class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryService(IOptions<CloudinarySettings> config)
    {
        var acc = new Account(
            config.Value.CloudName,
            config.Value.ApiKey,
            config.Value.ApiSecret
        );

        _cloudinary = new Cloudinary(acc);
    }

    public async Task<ImageUploadResult> UploadImageAsync(IFormFile file, string? folder = null)
    {
        var uploadResult = new ImageUploadResult();

        if (file.Length > 0)
        {
            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder
            };

            uploadResult = await _cloudinary.UploadAsync(uploadParams);
        }

        return uploadResult;
    }

    public async Task<VideoUploadResult> UploadVideoAsync(IFormFile file, string? folder = null)
    {
        var uploadResult = new VideoUploadResult();

        if (file.Length > 0)
        {
            using var stream = file.OpenReadStream();
            var uploadParams = new VideoUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder
            };

            uploadResult = await _cloudinary.UploadAsync(uploadParams);
        }

        return uploadResult;
    }

    public async Task<RawUploadResult> UploadRawFileAsync(IFormFile file, string? folder = null)
    {
        var uploadResult = new RawUploadResult();

        if (file.Length > 0)
        {
            using var stream = file.OpenReadStream();
            var uploadParams = new RawUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder
            };

            uploadResult = await _cloudinary.UploadAsync(uploadParams);
        }

        return uploadResult;
    }

    public async Task<DeletionResult> DeleteFileAsync(string publicId, ResourceType resourceType = ResourceType.Image)
    {
        var deleteParams = new DeletionParams(publicId)
        {
            ResourceType = resourceType
        };

        return await _cloudinary.DestroyAsync(deleteParams);
    }
}
