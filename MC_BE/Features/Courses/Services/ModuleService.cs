using MC_BE.Core.Entities;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Courses.Services;

public class ModuleService : IModuleService
{
    private readonly IGenericRepository<Module> _moduleRepository;
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<CourseMaterial> _materialRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ModuleService(
        IGenericRepository<Module> moduleRepository,
        IGenericRepository<Course> courseRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<CourseMaterial> materialRepository,
        IUnitOfWork unitOfWork)
    {
        _moduleRepository = moduleRepository;
        _courseRepository = courseRepository;
        _lessonRepository = lessonRepository;
        _materialRepository = materialRepository;
        _unitOfWork = unitOfWork;
    }

    private static ModuleDto MapToDto(Module module)
    {
        var lessons = (module.Lessons ?? new List<Lesson>())
            .OrderBy(l => l.OrderIndex)
            .Select(l => new LessonDto
            {
                LessonId = l.LessonId,
                CourseId = l.CourseId,
                ModuleId = l.ModuleId,
                Title = l.Title,
                Description = l.Description,
                LessonType = l.LessonType,
                OrderIndex = l.OrderIndex,
                DurationMinutes = l.DurationMinutes,
                IsPreview = l.IsPreview,
                Status = l.Status,
                CreatedAt = l.CreatedAt,
                VideoUrl = l.CourseMaterials?.FirstOrDefault(cm => cm.MaterialType == Core.Enums.MaterialType.OTHER || cm.MaterialType == Core.Enums.MaterialType.DOCUMENT || cm.FileUrl.Contains("youtube.com") || cm.FileUrl.Contains("youtu.be"))?.FileUrl
            })
            .ToList();

        return new ModuleDto
        {
            ModuleId = module.ModuleId,
            CourseId = module.CourseId,
            Title = module.Title,
            Description = module.Description,
            OrderIndex = module.OrderIndex,
            CreatedAt = module.CreatedAt,
            UpdatedAt = module.UpdatedAt,
            LessonsCount = lessons.Count,
            TotalDurationMinutes = lessons.Sum(l => l.DurationMinutes),
            Lessons = lessons
        };
    }

    public async Task<List<ModuleDto>> GetModulesByCourseIdAsync(int courseId)
    {
        var modules = await _moduleRepository.FindAsync(
            m => m.CourseId == courseId,
            m => m.Lessons);

        // Fetch lessons with materials for Mapping
        var lessonIds = modules.SelectMany(m => m.Lessons ?? Enumerable.Empty<Lesson>()).Select(l => l.LessonId).ToList();
        var lessonsWithMaterials = await _lessonRepository.FindAsync(
            l => lessonIds.Contains(l.LessonId),
            l => l.CourseMaterials);
        var lessonMaterialDict = lessonsWithMaterials.ToDictionary(l => l.LessonId, l => l.CourseMaterials);

        foreach (var mod in modules)
        {
            if (mod.Lessons != null)
            {
                foreach (var les in mod.Lessons)
                {
                    if (lessonMaterialDict.TryGetValue(les.LessonId, out var materials))
                    {
                        les.CourseMaterials = materials;
                    }
                }
            }
        }

        return modules
            .OrderBy(m => m.OrderIndex)
            .Select(MapToDto)
            .ToList();
    }

    public async Task<ModuleDto?> GetModuleByIdAsync(int moduleId)
    {
        var modules = await _moduleRepository.FindAsync(
            m => m.ModuleId == moduleId,
            m => m.Lessons);

        var module = modules.FirstOrDefault();
        if (module == null) return null;

        var lessonIds = (module.Lessons ?? new List<Lesson>()).Select(l => l.LessonId).ToList();
        var lessonsWithMaterials = await _lessonRepository.FindAsync(
            l => lessonIds.Contains(l.LessonId),
            l => l.CourseMaterials);
        var lessonMaterialDict = lessonsWithMaterials.ToDictionary(l => l.LessonId, l => l.CourseMaterials);

        if (module.Lessons != null)
        {
            foreach (var les in module.Lessons)
            {
                if (lessonMaterialDict.TryGetValue(les.LessonId, out var materials))
                {
                    les.CourseMaterials = materials;
                }
            }
        }

        return MapToDto(module);
    }

    public async Task<ModuleDto?> CreateModuleAsync(int courseId, int instructorId, CreateModuleRequest request)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course == null || course.InstructorId != instructorId) return null;

        var module = new Module
        {
            CourseId = courseId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            OrderIndex = request.OrderIndex,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _moduleRepository.AddAsync(module);
        await _unitOfWork.SaveChangesAsync();

        return MapToDto(module);
    }

    public async Task<ModuleDto?> UpdateModuleAsync(int moduleId, int instructorId, UpdateModuleRequest request)
    {
        var modules = await _moduleRepository.FindAsync(
            m => m.ModuleId == moduleId,
            m => m.Course,
            m => m.Lessons);

        var module = modules.FirstOrDefault();

        if (module == null || module.Course?.InstructorId != instructorId) return null;

        module.Title = request.Title.Trim();
        module.Description = request.Description?.Trim();
        module.OrderIndex = request.OrderIndex;
        module.UpdatedAt = DateTime.UtcNow;

        _moduleRepository.Update(module);
        await _unitOfWork.SaveChangesAsync();

        return MapToDto(module);
    }

    public async Task<bool> DeleteModuleAsync(int moduleId, int instructorId)
    {
        var modules = await _moduleRepository.FindAsync(
            m => m.ModuleId == moduleId,
            m => m.Course,
            m => m.Lessons);

        var module = modules.FirstOrDefault();

        if (module == null || module.Course?.InstructorId != instructorId) return false;

        // Cascade delete all lessons belonging to this module
        if (module.Lessons != null && module.Lessons.Any())
        {
            foreach (var lesson in module.Lessons)
            {
                _lessonRepository.Remove(lesson);
            }
        }

        _moduleRepository.Remove(module);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    public async Task<List<ModuleDto>> CreateModulesBulkAsync(int courseId, int instructorId, List<BulkImportModuleItemRequest> requests)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course == null || course.InstructorId != instructorId) return new List<ModuleDto>();

        var createdModules = new List<Module>();

        foreach (var modReq in requests)
        {
            var module = new Module
            {
                CourseId = courseId,
                Title = modReq.EffectiveTitle.Trim(),
                Description = modReq.EffectiveDescription?.Trim(),
                OrderIndex = modReq.EffectiveOrderIndex,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _moduleRepository.AddAsync(module);
            await _unitOfWork.SaveChangesAsync();

            if (modReq.Lessons != null && modReq.Lessons.Any())
            {
                foreach (var lesReq in modReq.Lessons)
                {
                    var lesson = new Lesson
                    {
                        CourseId = courseId,
                        ModuleId = module.ModuleId,
                        Title = lesReq.Title.Trim(),
                        Description = lesReq.Description?.Trim(),
                        LessonType = lesReq.LessonType ?? Core.Enums.LessonType.VIDEO,
                        OrderIndex = lesReq.OrderIndex,
                        DurationMinutes = lesReq.DurationMinutes,
                        IsPreview = lesReq.IsPreview,
                        Status = lesReq.Status,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _lessonRepository.AddAsync(lesson);
                    await _unitOfWork.SaveChangesAsync();

                    if (!string.IsNullOrWhiteSpace(lesReq.VideoUrl))
                    {
                        var material = new CourseMaterial
                        {
                            CourseId = courseId,
                            LessonId = lesson.LessonId,
                            UploaderId = instructorId,
                            Title = $"{lesReq.Title.Trim()} - Video",
                            MaterialType = Core.Enums.MaterialType.OTHER,
                            FileUrl = lesReq.VideoUrl.Trim(),
                            CreatedAt = DateTime.UtcNow
                        };
                        await _materialRepository.AddAsync(material);
                    }
                }
                await _unitOfWork.SaveChangesAsync();
            }

            createdModules.Add(module);
        }

        return await GetModulesByCourseIdAsync(courseId);
    }
}

