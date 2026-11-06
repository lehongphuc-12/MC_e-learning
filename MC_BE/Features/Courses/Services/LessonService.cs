using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Courses.Services;

public class LessonService : ILessonService
{
    private const long MaxVideoSizeBytes = 500L * 1024 * 1024;
    private static readonly HashSet<string> AllowedVideoTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "video/mp4", "video/webm", "video/ogg", "video/quicktime",
        "video/x-msvideo", "video/x-matroska", "video/mpeg",
    };
    private static readonly HashSet<string> AllowedVideoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".webm", ".ogv", ".mov", ".avi", ".mkv", ".mpeg", ".mpg",
    };

    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<CourseMaterial> _materialRepository;
    private readonly IGenericRepository<VideoUploadSession> _uploadSessionRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IR2StorageService _r2;
    private readonly ITranscriptionQueue _transcriptionQueue;

    public LessonService(
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<Course> courseRepository,
        IGenericRepository<CourseMaterial> materialRepository,
        IGenericRepository<VideoUploadSession> uploadSessionRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        IUnitOfWork unitOfWork,
        IR2StorageService r2,
        ITranscriptionQueue transcriptionQueue)
    {
        _lessonRepository = lessonRepository;
        _courseRepository = courseRepository;
        _materialRepository = materialRepository;
        _uploadSessionRepository = uploadSessionRepository;
        _enrollmentRepository = enrollmentRepository;
        _unitOfWork = unitOfWork;
        _r2 = r2;
        _transcriptionQueue = transcriptionQueue;
    }

    private LessonDto MapToDto(Lesson lesson)
    {
        var storedVideoUrl = LessonVideoUrlResolver.Resolve(lesson.CourseMaterials);
        var r2ObjectKey = FindR2VideoObjectKey(lesson.CourseMaterials);
        var videoUrl = r2ObjectKey is null && storedVideoUrl is not null && _r2.ExtractKeyFromUrl(storedVideoUrl) is null
            ? storedVideoUrl
            : null;
        var requiresPlaybackUrl = r2ObjectKey is not null;

        var subtitleUrl = lesson.SubtitleUrl is not null && _r2.ExtractKeyFromUrl(lesson.SubtitleUrl) is null
            ? lesson.SubtitleUrl
            : null;

        return new LessonDto
        {
            LessonId = lesson.LessonId,
            CourseId = lesson.CourseId,
            ModuleId = lesson.ModuleId,
            Title = lesson.Title,
            Description = lesson.Description,
            LessonType = lesson.LessonType,
            OrderIndex = lesson.OrderIndex,
            DurationMinutes = lesson.DurationMinutes,
            IsPreview = lesson.IsPreview,
            Status = lesson.Status,
            VideoUrl = videoUrl,
            // For playback in the paid-course player, a legacy external URL is not a usable video.
            // Treat only R2-backed material as playable so instructors are prompted to migrate it.
            HasVideo = requiresPlaybackUrl,
            RequiresPlaybackUrl = requiresPlaybackUrl,
            Transcript = lesson.Transcript,
            SubtitleUrl = subtitleUrl,
            TranscriptStatus = lesson.TranscriptStatus,
            CreatedAt = lesson.CreatedAt,
        };
    }

    public async Task<LessonPlaybackDto?> GetPlaybackAsync(int lessonId, int userId, bool isAdmin)
    {
        var lesson = await _lessonRepository.GetQueryable()
            .Include(l => l.Course)
            .Include(l => l.CourseMaterials)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        if (lesson?.Course is null || lesson.Status != LessonStatus.ACTIVE)
            return null;

        var isInstructor = lesson.Course.InstructorId == userId;
        if (!isAdmin && !isInstructor && !lesson.IsPreview)
        {
            var now = DateTime.UtcNow;
            var hasValidEnrollment = await _enrollmentRepository.GetQueryable().AnyAsync(e =>
                e.CourseId == lesson.CourseId && e.LearnerId == userId &&
                (e.Status == "ACTIVE" || e.Status == "COMPLETED") &&
                (!e.ExpiresAt.HasValue || e.ExpiresAt.Value > now));
            if (!hasValidEnrollment)
                return null;
        }

        // A lesson may still contain legacy Drive rows alongside its new R2 material.
        // Select a playable R2 object across all video materials instead of trusting row order.
        var objectKey = FindR2VideoObjectKey(lesson.CourseMaterials);
        if (string.IsNullOrWhiteSpace(objectKey))
            return null;

        const double expiresHours = 6;
        return new LessonPlaybackDto
        {
            LessonId = lessonId,
            Url = _r2.GetPresignedUrl(objectKey, expiresHours),
            ExpiresAt = DateTime.UtcNow.AddHours(expiresHours)
        };
    }

    private string? FindR2VideoObjectKey(IEnumerable<CourseMaterial> materials)
    {
        foreach (var material in materials.Where(item => item.MaterialType == MaterialType.VIDEO))
        {
            if (!string.IsNullOrWhiteSpace(material.ObjectKey))
                return material.ObjectKey;

            if (!string.IsNullOrWhiteSpace(material.FileUrl))
            {
                var key = _r2.ExtractKeyFromUrl(material.FileUrl);
                if (!string.IsNullOrWhiteSpace(key))
                    return key;
            }
        }

        return null;
    }

    public async Task<List<LessonDto>> GetLessonsByCourseIdAsync(int courseId)
    {
        var lessons = await _lessonRepository.GetQueryable()
            .Include(l => l.CourseMaterials)
            .Where(l => l.CourseId == courseId)
            .OrderBy(l => l.OrderIndex)
            .ThenBy(l => l.LessonId)
            .ToListAsync();

        return lessons.Select(MapToDto).ToList();
    }

    public async Task<LessonDto?> GetLessonByIdAsync(int lessonId)
    {
        var lesson = await _lessonRepository.GetQueryable()
            .Include(l => l.CourseMaterials)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        return lesson is null ? null : MapToDto(lesson);
    }

    public async Task<LessonDto?> CreateLessonAsync(int courseId, int instructorId, CreateLessonRequest request)
    {
        // Verify course exists and belongs to instructor
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null || course.InstructorId != instructorId)
            return null;

        var lesson = new Lesson
        {
            CourseId = courseId,
            ModuleId = request.ModuleId,
            Title = request.Title,
            Description = request.Description,
            LessonType = request.LessonType ?? LessonType.VIDEO,
            OrderIndex = request.OrderIndex,
            DurationMinutes = request.DurationMinutes,
            IsPreview = request.IsPreview,
            Status = request.Status,
            CreatedAt = DateTime.UtcNow,
        };

        await _lessonRepository.AddAsync(lesson);
        await _unitOfWork.SaveChangesAsync();

        // Save VideoUrl if provided
        if (!string.IsNullOrWhiteSpace(request.VideoUrl))
        {
            var normalizedUrl = LessonVideoUrlResolver.NormalizeStoredUrl(request.VideoUrl);
            var objectKey = _r2.ExtractKeyFromUrl(normalizedUrl);
            var material = new CourseMaterial
            {
                CourseId = courseId,
                LessonId = lesson.LessonId,
                UploaderId = instructorId,
                Title = $"{request.Title} - Video",
                MaterialType = MaterialType.VIDEO,
                FileUrl = objectKey is null ? normalizedUrl : string.Empty,
                ObjectKey = objectKey,
                CreatedAt = DateTime.UtcNow,
            };
            await _materialRepository.AddAsync(material);
            await _unitOfWork.SaveChangesAsync();
        }

        return await GetLessonByIdAsync(lesson.LessonId);
    }

    public async Task<List<LessonDto>> CreateLessonsBulkAsync(int courseId, int instructorId, List<CreateLessonRequest> requests)
    {
        var createdList = new List<LessonDto>();
        foreach (var req in requests)
        {
            var created = await CreateLessonAsync(courseId, instructorId, req);
            if (created != null)
            {
                createdList.Add(created);
            }
        }
        return createdList;
    }

    public async Task<LessonDto?> UpdateLessonAsync(int lessonId, int instructorId, UpdateLessonRequest request)
    {
        var lesson = await _lessonRepository.GetQueryable()
            .Include(l => l.Course)
            .Include(l => l.CourseMaterials)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        if (lesson is null || lesson.Course == null || lesson.Course.InstructorId != instructorId)
            return null;

        if (request.ModuleId.HasValue) lesson.ModuleId = request.ModuleId.Value;
        if (request.Title is not null) lesson.Title = request.Title;
        if (request.Description is not null) lesson.Description = request.Description;
        if (request.LessonType.HasValue) lesson.LessonType = request.LessonType.Value;
        if (request.OrderIndex.HasValue) lesson.OrderIndex = request.OrderIndex.Value;
        if (request.DurationMinutes.HasValue) lesson.DurationMinutes = request.DurationMinutes.Value;
        if (request.IsPreview.HasValue) lesson.IsPreview = request.IsPreview.Value;
        if (request.Status.HasValue) lesson.Status = request.Status.Value;

        if (request.VideoUrl is not null)
        {
            var existingMaterial = lesson.CourseMaterials?.FirstOrDefault(m => m.MaterialType == MaterialType.VIDEO);
            if (existingMaterial != null)
            {
                var normalizedUrl = LessonVideoUrlResolver.NormalizeStoredUrl(request.VideoUrl);
                existingMaterial.ObjectKey = _r2.ExtractKeyFromUrl(normalizedUrl);
                existingMaterial.FileUrl = existingMaterial.ObjectKey is null ? normalizedUrl : string.Empty;
                _materialRepository.Update(existingMaterial);
            }
            else if (!string.IsNullOrWhiteSpace(request.VideoUrl))
            {
                var normalizedUrl = LessonVideoUrlResolver.NormalizeStoredUrl(request.VideoUrl);
                var objectKey = _r2.ExtractKeyFromUrl(normalizedUrl);
                await _materialRepository.AddAsync(new CourseMaterial
                {
                    CourseId = lesson.CourseId,
                    LessonId = lesson.LessonId,
                    UploaderId = instructorId,
                    Title = $"{lesson.Title} - Video",
                    MaterialType = MaterialType.VIDEO,
                    FileUrl = objectKey is null ? normalizedUrl : string.Empty,
                    ObjectKey = objectKey,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        _lessonRepository.Update(lesson);
        await _unitOfWork.SaveChangesAsync();
        return await GetLessonByIdAsync(lessonId);
    }

    public async Task<bool> DeleteLessonAsync(int lessonId, int instructorId)
    {
        var lesson = await _lessonRepository.GetQueryable()
            .Include(l => l.Course)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        if (lesson is null || lesson.Course == null || lesson.Course.InstructorId != instructorId)
            return false;

        _lessonRepository.Remove(lesson);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // -----------------------------------------------------------------------
    // Cloudflare R2 video upload / delete
    // -----------------------------------------------------------------------

    public async Task<LessonDto?> UploadVideoAsync(int lessonId, int instructorId, IFormFile file)
    {
        var lesson = await _lessonRepository.GetQueryable()
            .Include(l => l.Course)
            .Include(l => l.CourseMaterials)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        if (lesson is null || lesson.Course == null || lesson.Course.InstructorId != instructorId)
            return null;

        ValidateVideoMetadata(file.FileName, file.ContentType, file.Length);
        string objectKey;
        await using (var uploadStream = file.OpenReadStream())
        {
            objectKey = await _r2.UploadObjectAsync(
                uploadStream,
                file.FileName,
                file.ContentType,
                $"lessons/{lessonId}");
        }

        var oldKey = await AttachVideoObjectAsync(lesson, instructorId, objectKey);
        await DeleteReplacedVideoAsync(oldKey, objectKey);
        await QueueTranscriptionAsync(lesson, objectKey, file.FileName);

        return await GetLessonByIdAsync(lessonId);
    }

    public async Task<List<VideoUploadSessionDto>> CreateVideoUploadSessionsAsync(
        int courseId,
        int instructorId,
        CreateVideoUploadSessionsRequest request)
    {
        if (courseId <= 0 || request.Files.Count is 0 or > 30)
            throw new InvalidOperationException("Chọn từ 1 đến 30 video hợp lệ cho khóa học.");

        var lessonIds = request.Files.Select(file => file.LessonId).ToList();
        if (lessonIds.Any(id => id <= 0) || lessonIds.Distinct().Count() != lessonIds.Count)
            throw new InvalidOperationException("Mỗi video phải được ghép với một bài học riêng biệt.");

        foreach (var file in request.Files)
            ValidateVideoMetadata(file.FileName, file.ContentType, file.Size);

        var lessons = await _lessonRepository.GetQueryable()
            .Include(lesson => lesson.Course)
            .Where(lesson => lesson.CourseId == courseId && lessonIds.Contains(lesson.LessonId))
            .ToListAsync();

        if (lessons.Count != lessonIds.Count || lessons.Any(lesson => lesson.Course?.InstructorId != instructorId))
            throw new InvalidOperationException("Một hoặc nhiều bài học không tồn tại hoặc không thuộc khóa học của bạn.");

        var expiresAt = DateTime.UtcNow.AddMinutes(15);
        var sessions = new List<VideoUploadSession>();
        var response = new List<VideoUploadSessionDto>();

        foreach (var file in request.Files)
        {
            var safeName = Path.GetFileName(file.FileName.Replace('\\', '/'));
            var extension = Path.GetExtension(safeName).ToLowerInvariant();
            var objectKey = $"lessons/{file.LessonId}/{Guid.NewGuid():N}{extension}";
            var session = new VideoUploadSession
            {
                CourseId = courseId,
                LessonId = file.LessonId,
                InstructorId = instructorId,
                ObjectKey = objectKey,
                FileName = safeName,
                ContentType = file.ContentType,
                ExpectedSize = file.Size,
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = expiresAt,
            };
            sessions.Add(session);
            response.Add(new VideoUploadSessionDto
            {
                SessionId = session.SessionId,
                LessonId = session.LessonId,
                ContentType = session.ContentType,
                UploadUrl = _r2.GetPresignedPutUrl(objectKey, session.ContentType, 15),
                ExpiresAt = expiresAt,
            });
        }

        await _uploadSessionRepository.AddRangeAsync(sessions);
        await _unitOfWork.SaveChangesAsync();
        return response;
    }

    public async Task<LessonDto?> CompleteVideoUploadSessionAsync(int courseId, Guid sessionId, int instructorId)
    {
        var session = await _uploadSessionRepository.GetQueryable()
            .FirstOrDefaultAsync(item => item.SessionId == sessionId
                && item.CourseId == courseId
                && item.InstructorId == instructorId);

        if (session is null)
            return null;

        var lesson = await _lessonRepository.GetQueryable()
            .Include(item => item.Course)
            .Include(item => item.CourseMaterials)
            .FirstOrDefaultAsync(item => item.LessonId == session.LessonId && item.CourseId == courseId);
        if (lesson?.Course is null || lesson.Course.InstructorId != instructorId)
            return null;

        if (session.Status == "COMPLETED")
            return await GetLessonByIdAsync(session.LessonId);

        if (session.Status != "PENDING")
            throw new InvalidOperationException("Upload session đã hết hạn hoặc không còn hợp lệ.");

        if (session.ExpiresAt <= DateTime.UtcNow)
        {
            session.Status = "EXPIRED";
            _uploadSessionRepository.Update(session);
            await _unitOfWork.SaveChangesAsync();
            throw new InvalidOperationException("Upload session đã hết hạn. Vui lòng tải lại video.");
        }

        var metadata = await _r2.GetObjectMetadataAsync(session.ObjectKey);
        if (metadata is null)
            throw new InvalidOperationException("Không tìm thấy video trên R2. Hãy kiểm tra kết nối và thử lại.");
        if (metadata.Value.ContentLength != session.ExpectedSize)
            throw new InvalidOperationException("Kích thước video tải lên không khớp với file đã chọn.");
        if (!string.Equals(metadata.Value.ContentType, session.ContentType, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Định dạng video trên R2 không khớp với phiên upload.");

        session.Status = "COMPLETED";
        session.CompletedAt = DateTime.UtcNow;
        var oldKey = await AttachVideoObjectAsync(lesson, instructorId, session.ObjectKey);

        await DeleteReplacedVideoAsync(oldKey, session.ObjectKey);
        await QueueTranscriptionAsync(lesson, session.ObjectKey, session.FileName);
        return await GetLessonByIdAsync(session.LessonId);
    }

    private static void ValidateVideoMetadata(string? fileName, string? contentType, long size)
    {
        var safeName = Path.GetFileName((fileName ?? string.Empty).Replace('\\', '/'));
        var extension = Path.GetExtension(safeName);
        if (string.IsNullOrWhiteSpace(safeName) || !AllowedVideoExtensions.Contains(extension))
            throw new InvalidOperationException("Định dạng file không được hỗ trợ.");
        if (string.IsNullOrWhiteSpace(contentType) || !AllowedVideoTypes.Contains(contentType))
            throw new InvalidOperationException("Chỉ chấp nhận video MP4, WEBM, OGG, MOV, AVI, MKV hoặc MPEG.");
        if (size <= 0 || size > MaxVideoSizeBytes)
            throw new InvalidOperationException("Video phải có dung lượng từ 1 byte đến 500 MB.");
    }

    private async Task<string?> AttachVideoObjectAsync(Lesson lesson, int instructorId, string objectKey)
    {
        var material = lesson.CourseMaterials.FirstOrDefault(item => item.MaterialType == MaterialType.VIDEO);
        var oldKey = material?.ObjectKey ??
            (material is null ? null : _r2.ExtractKeyFromUrl(material.FileUrl));

        if (material is null)
        {
            var title = lesson.Title.Length > 200 ? $"{lesson.Title[..200]} - Video" : $"{lesson.Title} - Video";
            await _materialRepository.AddAsync(new CourseMaterial
            {
                CourseId = lesson.CourseId,
                LessonId = lesson.LessonId,
                UploaderId = instructorId,
                Title = title,
                MaterialType = MaterialType.VIDEO,
                FileUrl = string.Empty,
                ObjectKey = objectKey,
                CreatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            material.ObjectKey = objectKey;
            material.FileUrl = string.Empty;
            _materialRepository.Update(material);
        }

        lesson.TranscriptStatus = TranscriptStatus.PROCESSING;
        lesson.Transcript = null;
        lesson.SubtitleUrl = null;
        lesson.SubtitleObjectKey = null;
        _lessonRepository.Update(lesson);
        await _unitOfWork.SaveChangesAsync();
        return oldKey;
    }

    private async Task DeleteReplacedVideoAsync(string? oldKey, string newKey)
    {
        if (!string.IsNullOrWhiteSpace(oldKey) && !string.Equals(oldKey, newKey, StringComparison.Ordinal))
        {
            try { await _r2.DeleteAsync(oldKey); }
            catch { /* Keep the database pointing at the confirmed new object. */ }
        }
    }

    private async Task QueueTranscriptionAsync(Lesson lesson, string objectKey, string originalFileName)
    {
        await _transcriptionQueue.EnqueueAsync(new TranscriptionJob
        {
            LessonId = lesson.LessonId,
            VideoObjectKey = objectKey,
            OriginalFileName = originalFileName,
        });
    }

    public async Task<bool> DeleteVideoAsync(int lessonId, int instructorId)
    {
        var lesson = await _lessonRepository.GetQueryable()
            .Include(l => l.Course)
            .Include(l => l.CourseMaterials)
            .FirstOrDefaultAsync(l => l.LessonId == lessonId);

        if (lesson is null || lesson.Course == null || lesson.Course.InstructorId != instructorId)
            return false;

        var material = lesson.CourseMaterials
            ?.FirstOrDefault(m => m.MaterialType == MaterialType.VIDEO);

        if (material == null) return false;

        // Remove video from R2
        var key = material.ObjectKey ?? _r2.ExtractKeyFromUrl(material.FileUrl ?? string.Empty);
        if (key != null)
        {
            try { await _r2.DeleteAsync(key); }
            catch { /* log and continue */ }
        }

        // Remove subtitle from R2 if present
        if (!string.IsNullOrWhiteSpace(lesson.SubtitleObjectKey) || !string.IsNullOrWhiteSpace(lesson.SubtitleUrl))
        {
            var subKey = lesson.SubtitleObjectKey ?? _r2.ExtractKeyFromUrl(lesson.SubtitleUrl!);
            if (subKey != null)
            {
                try { await _r2.DeleteAsync(subKey); }
                catch { /* log and continue */ }
            }
            lesson.SubtitleUrl = null;
            lesson.SubtitleObjectKey = null;
            lesson.Transcript = null;
            lesson.TranscriptStatus = TranscriptStatus.NONE;
            _lessonRepository.Update(lesson);
        }

        // Remove the DB record
        _materialRepository.Remove(material);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }
}

