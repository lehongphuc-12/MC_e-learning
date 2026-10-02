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
    private readonly IUnitOfWork _unitOfWork;
    private readonly IR2StorageService _r2;

    public LessonService(
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<Course> courseRepository,
        IGenericRepository<CourseMaterial> materialRepository,
        IUnitOfWork unitOfWork,
        IR2StorageService r2)
    {
        _lessonRepository = lessonRepository;
        _courseRepository = courseRepository;
        _materialRepository = materialRepository;
        _unitOfWork = unitOfWork;
        _r2 = r2;
    }

    private LessonDto MapToDto(Lesson lesson)
    {
        var material = lesson.CourseMaterials?.FirstOrDefault(m => m.MaterialType == MaterialType.VIDEO);
        var videoUrl = material?.FileUrl;

        if (!string.IsNullOrWhiteSpace(videoUrl))
        {
            var key = _r2.ExtractKeyFromUrl(videoUrl);
            if (key != null && videoUrl.Contains(".r2.cloudflarestorage.com") && !videoUrl.Contains("X-Amz-Signature"))
            {
                videoUrl = _r2.GetPresignedUrl(key);
            }
        }

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
            CreatedAt = lesson.CreatedAt,
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
            var material = new CourseMaterial
            {
                CourseId = courseId,
                LessonId = lesson.LessonId,
                UploaderId = instructorId,
                Title = $"{request.Title} - Video",
                MaterialType = MaterialType.VIDEO,
                FileUrl = request.VideoUrl.Trim(),
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
                existingMaterial.FileUrl = request.VideoUrl;
                _materialRepository.Update(existingMaterial);
            }
            else if (!string.IsNullOrWhiteSpace(request.VideoUrl))
            {
                await _materialRepository.AddAsync(new CourseMaterial
                {
                    CourseId = lesson.CourseId,
                    LessonId = lesson.LessonId,
                    UploaderId = instructorId,
                    Title = $"{lesson.Title} - Video",
                    MaterialType = MaterialType.VIDEO,
                    FileUrl = request.VideoUrl.Trim(),
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

        // If there is an existing video material, delete the old R2 object first
        var existingMaterial = lesson.CourseMaterials
            ?.FirstOrDefault(m => m.MaterialType == MaterialType.VIDEO);

        if (existingMaterial != null && !string.IsNullOrWhiteSpace(existingMaterial.FileUrl))
        {
            var oldKey = _r2.ExtractKeyFromUrl(existingMaterial.FileUrl);
            if (oldKey != null)
            {
                try { await _r2.DeleteAsync(oldKey); }
                catch { /* log and continue — don't fail the upload */ }
            }
        }

        // Upload new file to R2
        await using var stream = file.OpenReadStream();
        var publicUrl = await _r2.UploadAsync(
            stream,
            file.FileName,
            file.ContentType ?? "video/mp4",
            folder);

        if (existingMaterial != null)
        {
            // Update existing material record
            existingMaterial.FileUrl = publicUrl;
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
                FileUrl = publicUrl,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _unitOfWork.SaveChangesAsync();
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

        // Remove from R2
        var key = _r2.ExtractKeyFromUrl(material.FileUrl ?? string.Empty);
        if (key != null)
        {
            try { await _r2.DeleteAsync(key); }
            catch { /* log and continue */ }
        }

        // Remove the DB record
        _materialRepository.Remove(material);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }
}

