using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using System.Text.RegularExpressions;

namespace MC_BE.Features.Courses.Services;

/// <summary>
/// Implements all Course CRUD operations using generic repositories.
/// </summary>
public class CourseService : ICourseService
{
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<Category> _categoryRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<LessonProgress> _lessonProgressRepository;
    private readonly IGenericRepository<Certificate> _certificateRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CourseService(
        IGenericRepository<Course> courseRepository,
        IGenericRepository<Category> categoryRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<LessonProgress> lessonProgressRepository,
        IGenericRepository<Certificate> certificateRepository,
        IUnitOfWork unitOfWork)
    {
        _courseRepository = courseRepository;
        _categoryRepository = categoryRepository;
        _enrollmentRepository = enrollmentRepository;
        _lessonRepository = lessonRepository;
        _lessonProgressRepository = lessonProgressRepository;
        _certificateRepository = certificateRepository;
        _unitOfWork = unitOfWork;
    }


    // -------------------------------------------------------------------------
    // Slug generation helper
    // Converts "Master of Ceremonies Training!" → "master-of-ceremonies-training"
    // Appends a short unique suffix to guarantee uniqueness in the DB.
    // -------------------------------------------------------------------------
    private static string GenerateSlug(string title)
    {
        // 1. Lowercase and trim
        var slug = title.Trim().ToLowerInvariant();
        // 2. Replace spaces and special chars with hyphens
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = slug.Trim('-');
        // 3. Append a short random suffix to avoid conflicts
        var suffix = Guid.NewGuid().ToString("N")[..6];
        return $"{slug}-{suffix}";
    }

    // -------------------------------------------------------------------------
    // Map Course entity → CourseDto (project from EF navigation properties)
    // -------------------------------------------------------------------------
    private static CourseDto MapToDto(Course course) => new()
    {
        CourseId      = course.CourseId,
        CategoryId    = course.CategoryId,
        CategoryName  = course.Category?.CategoryName,
        InstructorId  = course.InstructorId,
        InstructorName = course.Instructor?.FullName,
        Title         = course.Title,
        Slug          = course.Slug,
        Description   = course.Description,
        ThumbnailUrl  = course.ThumbnailUrl,
        Price         = course.Price,
        Level         = course.Level,
        Status        = course.Status,
        CreatedAt     = course.CreatedAt,
        UpdatedAt     = course.UpdatedAt,
    };

    private async Task<IEnumerable<Course>> FilterCoursesAsync(int? instructorId, string? status, int? categoryId, string? search)
    {
        var courses = await _courseRepository.GetAllAsync(c => c.Category, c => c.Instructor);
        var query = courses.AsQueryable();

        if (instructorId.HasValue)
            query = query.Where(c => c.InstructorId == instructorId.Value);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<CourseStatus>(status, true, out var parsedStatus))
            query = query.Where(c => c.Status == parsedStatus);

        if (categoryId.HasValue)
            query = query.Where(c => c.CategoryId == categoryId.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => c.Title.ToLower().Contains(search.ToLower()));

        return query.OrderByDescending(c => c.UpdatedAt).ToList();
    }

    // -------------------------------------------------------------------------
    // GET Instructor's own courses (paginated)
    // -------------------------------------------------------------------------
    public async Task<CourseListResponse> GetInstructorCoursesAsync(
        int instructorId, int page, int limit, string? status, int? categoryId, string? search)
    {
        var courses = await FilterCoursesAsync(instructorId, status, categoryId, search);
        return ExecutePaginatedList(courses, page, limit);
    }

    // -------------------------------------------------------------------------
    // GET All courses — Admin only
    // -------------------------------------------------------------------------
    public async Task<CourseListResponse> GetAllCoursesAsync(
        int page, int limit, string? status, int? categoryId, string? search)
    {
        var courses = await FilterCoursesAsync(null, status, categoryId, search);
        return ExecutePaginatedList(courses, page, limit);
    }

    // -------------------------------------------------------------------------
    // Execute pagination — shared between both list methods
    // -------------------------------------------------------------------------
    private static CourseListResponse ExecutePaginatedList(
        IEnumerable<Course> source, int page, int limit)
    {
        var list = source.ToList();
        var total = list.Count;
        var items = list
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return new CourseListResponse
        {
            Data = items.Select(MapToDto).ToList(),
            Pagination = new PaginationMeta
            {
                Page       = page,
                Limit      = limit,
                Total      = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            }
        };
    }

    // -------------------------------------------------------------------------
    // GET single course by ID
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> GetCourseByIdAsync(int courseId)
    {
        var courses = await _courseRepository.FindAsync(
            c => c.CourseId == courseId,
            c => c.Category,
            c => c.Instructor);

        var course = courses.FirstOrDefault();
        return course is null ? null : MapToDto(course);
    }

    // -------------------------------------------------------------------------
    // CREATE course
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> CreateCourseAsync(int instructorId, CreateCourseRequest request)
    {
        // Validate the CategoryId FK if provided
        if (request.CategoryId.HasValue)
        {
            var cat = await _categoryRepository.GetByIdAsync(request.CategoryId.Value);
            if (cat == null) return null; // Let caller decide the error response
        }

        var course = new Course
        {
            InstructorId = instructorId,
            CategoryId   = request.CategoryId,
            Title        = request.Title,
            Slug         = GenerateSlug(request.Title),
            Description  = request.Description,
            ThumbnailUrl = request.ThumbnailUrl,
            Price        = request.Price,
            Level        = request.Level,
            Status       = request.Status,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        await _courseRepository.AddAsync(course);
        await _unitOfWork.SaveChangesAsync();

        // Reload with includes so the returned DTO has CategoryName/InstructorName
        return await GetCourseByIdAsync(course.CourseId);
    }

    // -------------------------------------------------------------------------
    // UPDATE course (partial — only updates non-null fields)
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> UpdateCourseAsync(int courseId, int instructorId, UpdateCourseRequest request)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);

        // 404 or 403: not found OR caller is not the owner
        if (course is null || course.InstructorId != instructorId)
            return null;

        // Apply only the fields that the client explicitly sent
        if (request.Title is not null)
        {
            course.Title = request.Title;
            course.Slug  = GenerateSlug(request.Title); // Re-generate slug when title changes
        }
        if (request.Description is not null) course.Description = request.Description;
        if (request.CategoryId.HasValue)     course.CategoryId  = request.CategoryId;
        if (request.ThumbnailUrl is not null) course.ThumbnailUrl = request.ThumbnailUrl;
        if (request.Price.HasValue)          course.Price       = request.Price.Value;
        if (request.Level.HasValue)          course.Level       = request.Level;
        if (request.Status.HasValue)         course.Status      = request.Status.Value;

        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();

        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // DELETE course
    // -------------------------------------------------------------------------
    public async Task<bool> DeleteCourseAsync(int courseId, int instructorId)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null || course.InstructorId != instructorId)
            return false;

        _courseRepository.Remove(course);
        await _unitOfWork.SaveChangesAsync();
        return true;
    }

    // -------------------------------------------------------------------------
    // PATCH status (quick toggle from table row)
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> UpdateCourseStatusAsync(int courseId, int instructorId, string newStatus)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null || course.InstructorId != instructorId)
            return null;

        if (!Enum.TryParse<CourseStatus>(newStatus, true, out var parsedStatus))
            return null; // Invalid status string

        course.Status    = parsedStatus;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();

        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // BULK CREATE courses
    // -------------------------------------------------------------------------
    public async Task<List<CourseDto>> CreateCoursesBulkAsync(int instructorId, List<CreateCourseRequest> requests)
    {
        var createdList = new List<CourseDto>();
        foreach (var req in requests)
        {
            var created = await CreateCourseAsync(instructorId, req);
            if (created != null)
            {
                createdList.Add(created);
            }
        }
        return createdList;
    }

    // -------------------------------------------------------------------------
    // GET Learned Courses (for enrolled learner)
    // -------------------------------------------------------------------------
    public async Task<List<LearnedCourseDto>> GetLearnedCoursesAsync(int learnerId)
    {
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId && (e.Status == "ACTIVE" || e.Status == "COMPLETED" || e.Status == "EXPIRED"),
            e => e.Course,
            e => e.Course.Category,
            e => e.Course.Instructor,
            e => e.LessonProgresses);

        var result = new List<LearnedCourseDto>();

        foreach (var enrollment in enrollments.OrderByDescending(e => e.UpdatedAt))
        {
            if (enrollment.Course == null) continue;

            var courseDto = MapToDto(enrollment.Course);

            var lessons = await _lessonRepository.FindAsync(
                l => l.CourseId == enrollment.CourseId && l.Status == LessonStatus.ACTIVE);
            var totalLessonsCount = lessons.Count();

            var progressList = enrollment.LessonProgresses ?? new List<LessonProgress>();
            var completedProgresses = progressList.Where(p => p.IsCompleted || p.Status == LessonProgressStatus.COMPLETED).ToList();
            var completedCount = completedProgresses.Count;

            decimal progressPercent = totalLessonsCount > 0
                ? Math.Round((decimal)completedCount / totalLessonsCount * 100, 2)
                : Convert.ToDecimal(enrollment.CompletionPercentage);

            var lastProgress = progressList.OrderByDescending(p => p.LastAccessedAt ?? p.UpdatedAt).FirstOrDefault();
            string? lastLectureTitle = null;
            if (lastProgress != null)
            {
                var lastLesson = lessons.FirstOrDefault(l => l.LessonId == lastProgress.LessonId);
                lastLectureTitle = lastLesson?.Title;
            }

            var certs = await _certificateRepository.FindAsync(c => c.EnrollmentId == enrollment.EnrollmentId);
            var cert = certs.FirstOrDefault();

            bool isCompleted = progressPercent >= 100m || enrollment.Status == "COMPLETED";

            result.Add(new LearnedCourseDto
            {
                EnrollmentId = enrollment.EnrollmentId,
                CourseId = enrollment.CourseId,
                Course = courseDto,
                ProgressPercent = progressPercent,
                CompletedLecturesCount = completedCount,
                TotalLecturesCount = totalLessonsCount,
                LastAccessedAt = lastProgress?.LastAccessedAt ?? enrollment.UpdatedAt,
                LastLectureTitle = lastLectureTitle,
                Status = isCompleted ? "completed" : "in-progress",
                EnrolledDate = enrollment.EnrolledAt ?? enrollment.CreatedAt,
                CertificateId = cert?.CertificateId
            });
        }

        return result;
    }
}


