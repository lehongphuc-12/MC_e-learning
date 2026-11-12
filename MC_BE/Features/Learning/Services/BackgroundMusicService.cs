using CloudinaryDotNet.Actions;
using MC_BE.Core.Entities;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Services;

public class BackgroundMusicService : IBackgroundMusicService
{
    private readonly SmartMcDbContext _db;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ILogger<BackgroundMusicService> _logger;

    private static readonly string[] AllowedExtensions = { ".mp3", ".wav", ".ogg", ".m4a" };
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

    public BackgroundMusicService(
        SmartMcDbContext db,
        ICloudinaryService cloudinaryService,
        ILogger<BackgroundMusicService> logger)
    {
        _db = db;
        _cloudinaryService = cloudinaryService;
        _logger = logger;
    }

    public async Task<List<BackgroundMusicDto>> GetDefaultMusicsAsync()
    {
        return await _db.BackgroundMusics
            .AsNoTracking()
            .Where(m => m.IsSystemDefault)
            .OrderBy(m => m.MusicId)
            .Select(m => new BackgroundMusicDto
            {
                MusicId = m.MusicId,
                Title = m.Title,
                AudioUrl = m.AudioUrl,
                IsSystemDefault = m.IsSystemDefault,
                LessonId = m.LessonId
            })
            .ToListAsync();
    }

    public async Task<List<BackgroundMusicDto>> GetMusicsForLessonAsync(int lessonId)
    {
        return await _db.BackgroundMusics
            .AsNoTracking()
            .Where(m => m.IsSystemDefault || m.LessonId == lessonId)
            .OrderBy(m => !m.IsSystemDefault)
            .ThenBy(m => m.MusicId)
            .Select(m => new BackgroundMusicDto
            {
                MusicId = m.MusicId,
                Title = m.Title,
                AudioUrl = m.AudioUrl,
                IsSystemDefault = m.IsSystemDefault,
                LessonId = m.LessonId
            })
            .ToListAsync();
    }

    public async Task<BackgroundMusicDto> UploadMusicForLessonAsync(
        int lessonId,
        IFormFile file,
        string title,
        int instructorId)
    {
        ValidateAudioFile(file);

        var lesson = await _db.Lessons
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        if (lesson == null)
        {
            throw new KeyNotFoundException("Không tìm thấy bài học tương ứng.");
        }

        if (lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý nhạc nền cho bài học này.");
        }

        var uploadResult = await _cloudinaryService.UploadVideoAsync(file, $"background-music/lesson-{lessonId}");
        if (uploadResult.Error != null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
        {
            _logger.LogError("Cloudinary upload failed: {Error}", uploadResult.Error?.Message);
            throw new InvalidOperationException("Không thể tải tập tin nhạc lên máy chủ lưu trữ.");
        }

        var music = new BackgroundMusic
        {
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            AudioUrl = uploadResult.SecureUrl.ToString(),
            CloudinaryPublicId = uploadResult.PublicId,
            IsSystemDefault = false,
            LessonId = lessonId,
            CreatedAt = DateTime.UtcNow
        };

        _db.BackgroundMusics.Add(music);
        await _db.SaveChangesAsync();

        return new BackgroundMusicDto
        {
            MusicId = music.MusicId,
            Title = music.Title,
            AudioUrl = music.AudioUrl,
            IsSystemDefault = music.IsSystemDefault,
            LessonId = music.LessonId
        };
    }

    public async Task<PreUploadMusicResultDto> PreUploadMusicAsync(IFormFile file, string title, int instructorId)
    {
        ValidateAudioFile(file);

        var uploadResult = await _cloudinaryService.UploadVideoAsync(file, "background-music/custom-uploads");
        if (uploadResult.Error != null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
        {
            _logger.LogError("Cloudinary pre-upload failed: {Error}", uploadResult.Error?.Message);
            throw new InvalidOperationException("Không thể tải tập tin nhạc lên Cloudinary.");
        }

        return new PreUploadMusicResultDto
        {
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            AudioUrl = uploadResult.SecureUrl.ToString(),
            CloudinaryPublicId = uploadResult.PublicId ?? string.Empty
        };
    }

    public async Task<List<BackgroundMusicDto>> LinkMusicsToLessonAsync(
        int lessonId,
        List<LinkBackgroundMusicItem> musics,
        int instructorId)
    {
        if (musics == null || musics.Count == 0)
        {
            return new List<BackgroundMusicDto>();
        }

        var lesson = await _db.Lessons
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        if (lesson == null)
        {
            throw new KeyNotFoundException("Không tìm thấy bài học tương ứng.");
        }

        if (lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền quản lý nhạc nền cho bài học này.");
        }

        var newRecords = musics.Select(m => new BackgroundMusic
        {
            Title = m.Title.Trim(),
            AudioUrl = m.AudioUrl.Trim(),
            CloudinaryPublicId = m.CloudinaryPublicId,
            IsSystemDefault = false,
            LessonId = lessonId,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _db.BackgroundMusics.AddRange(newRecords);
        await _db.SaveChangesAsync();

        return newRecords.Select(m => new BackgroundMusicDto
        {
            MusicId = m.MusicId,
            Title = m.Title,
            AudioUrl = m.AudioUrl,
            IsSystemDefault = m.IsSystemDefault,
            LessonId = m.LessonId
        }).ToList();
    }

    public async Task<bool> DeleteMusicAsync(int musicId, int instructorId)
    {
        var music = await _db.BackgroundMusics
            .Include(m => m.Lesson)
            .ThenInclude(l => l!.Course)
            .FirstOrDefaultAsync(m => m.MusicId == musicId);

        if (music == null)
        {
            return false;
        }

        if (music.IsSystemDefault)
        {
            throw new InvalidOperationException("Không thể xóa nhạc nền mặc định của hệ thống.");
        }

        if (music.Lesson?.Course != null && music.Lesson.Course.InstructorId != instructorId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xóa nhạc nền này.");
        }

        if (!string.IsNullOrEmpty(music.CloudinaryPublicId))
        {
            try
            {
                await _cloudinaryService.DeleteFileAsync(music.CloudinaryPublicId, ResourceType.Video);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete file from Cloudinary with PublicId {PublicId}", music.CloudinaryPublicId);
            }
        }

        _db.BackgroundMusics.Remove(music);
        await _db.SaveChangesAsync();
        return true;
    }

    private static void ValidateAudioFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("Vui lòng tải lên tập tin âm thanh.");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new ArgumentException("Dung lượng tập tin nhạc không được vượt quá 5MB.");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
        {
            throw new ArgumentException("Định dạng tập tin không hợp lệ. Chỉ chấp nhận các định dạng: .mp3, .wav, .ogg, .m4a.");
        }
    }
}
