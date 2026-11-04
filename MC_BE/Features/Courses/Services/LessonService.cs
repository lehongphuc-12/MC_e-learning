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
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<CourseMaterial> _materialRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IR2StorageService _r2;
    private readonly ITranscriptionQueue _transcriptionQueue;

    public LessonService(
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<Course> courseRepository,
        IGenericRepository<CourseMaterial> materialRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        IUnitOfWork unitOfWork,
        IR2StorageService r2,
        ITranscriptionQueue transcriptionQueue)
    {
        _lessonRepository = lessonRepository;
        _courseRepository = courseRepository;
        _materialRepository = materialRepository;
        _enrollmentRepository = enrollmentRepository;
        _unitOfWork = unitOfWork;
        _r2 = r2;
        _transcriptionQueue = transcriptionQueue;
    }

    private LessonDto MapToDto(Lesson lesson)
    {
        var storedVideoUrl = LessonVideoUrlResolver.Resolve(lesson.CourseMaterials);
        var videoMaterial = lesson.CourseMaterials.FirstOrDefault(m => m.MaterialType == MaterialType.VIDEO);
        var videoUrl = storedVideoUrl is not null && _r2.ExtractKeyFromUrl(storedVideoUrl) is null
            ? storedVideoUrl
            : null;
        var requiresPlaybackUrl = !string.IsNullOrWhiteSpace(videoMaterial?.ObjectKey) ||
            (storedVideoUrl is not null && _r2.ExtractKeyFromUrl(storedVideoUrl) is not null);

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
            HasVideo = lesson.CourseMaterials.Any(m => m.MaterialType == MaterialType.VIDEO &&
                (!string.IsNullOrWhiteSpace(m.ObjectKey) || !string.IsNullOrWhiteSpace(m.FileUrl))),
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

        var videoMaterial = lesson.CourseMaterials.FirstOrDefault(m => m.MaterialType == MaterialType.VIDEO);
        var storedUrl = videoMaterial?.FileUrl;
        var objectKey = videoMaterial?.ObjectKey;
        if (string.IsNullOrWhiteSpace(objectKey) && !string.IsNullOrWhiteSpace(storedUrl))
            objectKey = _r2.ExtractKeyFromUrl(storedUrl);

        if (string.IsNullOrWhiteSpace(objectKey))
        {
            if (!string.IsNullOrWhiteSpace(storedUrl) && _r2.ExtractKeyFromUrl(storedUrl) is null)
            {
                // SECURITY HARDENING — enable after learner videos have been migrated to private R2.
                // Public third-party sources can be copied out of the provider's embedded player.
                // if (!isInstructor && !isAdmin)
                //     return null;

                return new LessonPlaybackDto { LessonId = lessonId, Url = storedUrl, ExpiresAt = DateTime.UtcNow.AddHours(24) };
            }
            return null;
        }

        const double expiresHours = 6;
        return new LessonPlaybackDto
        {
            LessonId = lessonId,
            Url = _r2.GetPresignedUrl(objectKey, expiresHours),
            ExpiresAt = DateTime.UtcNow.AddHours(expiresHours)
        };
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

        // Determine a folder path inside R2 — keeps bucket tidy
        var folder = $"lessons/{lessonId}";

        var existingMaterial = lesson.CourseMaterials
            ?.FirstOrDefault(m => m.MaterialType == MaterialType.VIDEO);
        var oldKey = existingMaterial?.ObjectKey ??
            (existingMaterial is null ? null : _r2.ExtractKeyFromUrl(existingMaterial.FileUrl));

        // Save uploaded video temporarily to disk for background transcription
        var tempVideoPath = Path.Combine(Path.GetTempPath(), $"mseek_upload_{lessonId}_{Guid.NewGuid():N}{Path.GetExtension(file.FileName)}");
        await using (var tempFs = new FileStream(tempVideoPath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(tempFs);
        }

        // Upload new file to R2 from local file stream
        string objectKey;
        await using (var uploadStream = File.OpenRead(tempVideoPath))
        {
            objectKey = await _r2.UploadObjectAsync(
                uploadStream,
                file.FileName,
                file.ContentType ?? "video/mp4",
                folder);
        }

        if (existingMaterial != null)
        {
            // Update existing material record
            existingMaterial.ObjectKey = objectKey;
            existingMaterial.FileUrl = string.Empty;
            _materialRepository.Update(existingMaterial);
        }
        else
        {
            var materialTitle = lesson.Title?.Length > 200 
                ? $"{lesson.Title.Substring(0, 200)} - Video" 
                : $"{lesson.Title} - Video";

            await _materialRepository.AddAsync(new CourseMaterial
            {
                CourseId = lesson.CourseId,
                LessonId = lesson.LessonId,
                UploaderId = instructorId,
                Title = materialTitle,
                MaterialType = MaterialType.VIDEO,
                FileUrl = string.Empty,
                ObjectKey = objectKey,
                CreatedAt = DateTime.UtcNow,
            });
        }

        // Mark transcription as PROCESSING and reset previous transcript/subtitles
        lesson.TranscriptStatus = TranscriptStatus.PROCESSING;
        lesson.Transcript = null;
        lesson.SubtitleUrl = null;
        lesson.SubtitleObjectKey = null;
        _lessonRepository.Update(lesson);

        await _unitOfWork.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(oldKey) && !string.Equals(oldKey, objectKey, StringComparison.Ordinal))
        {
            try { await _r2.DeleteAsync(oldKey); }
            catch { /* Keep the database pointing at the new upload if cleanup fails. */ }
        }

        // Enqueue background transcription job
        await _transcriptionQueue.EnqueueAsync(new TranscriptionJob
        {
            LessonId = lesson.LessonId,
            VideoTempFilePath = tempVideoPath,
            OriginalFileName = file.FileName
        });

        return await GetLessonByIdAsync(lessonId);
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

