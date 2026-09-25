using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace MC_BE.Features.Courses.Services;

/// <summary>
/// Implements all Course CRUD operations.
/// Uses GenericRepository and UnitOfWork to decouple service logic from DbContext.
/// </summary>
public class CourseService : ICourseService
{
    private readonly IGenericRepository<Course> _courseRepository;
    private readonly IGenericRepository<Category> _categoryRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<LessonProgress> _lessonProgressRepository;
    private readonly IGenericRepository<Certificate> _certificateRepository;
    private readonly IGenericRepository<Module> _moduleRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CourseService(
        IGenericRepository<Course> courseRepository,
        IGenericRepository<Category> categoryRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<LessonProgress> lessonProgressRepository,
        IGenericRepository<Certificate> certificateRepository,
        IGenericRepository<Module> moduleRepository,
        IUnitOfWork unitOfWork)
    {
        _courseRepository = courseRepository;
        _categoryRepository = categoryRepository;
        _enrollmentRepository = enrollmentRepository;
        _lessonRepository = lessonRepository;
        _lessonProgressRepository = lessonProgressRepository;
        _certificateRepository = certificateRepository;
        _moduleRepository = moduleRepository;
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
        CourseId = course.CourseId,
        CategoryId = course.CategoryId,
        CategoryName = course.Category?.CategoryName,
        InstructorId = course.InstructorId,
        InstructorName = course.Instructor?.FullName,
        Title = course.Title,
        Slug = course.Slug,
        Description = course.Description,
        ThumbnailUrl = course.ThumbnailUrl,
        Price = course.Price,
        Level = course.Level,
        Status = course.Status,
        CreatedAt = course.CreatedAt,
        UpdatedAt = course.UpdatedAt,
        SubmittedAt = course.SubmittedAt,
        ApprovedAt = course.ApprovedAt,
        ApprovedById = course.ApprovedById,
        ApprovedByName = course.ApprovedBy?.FullName,
        SubmissionNote = course.SubmissionNote,
        RejectionReason = course.RejectionReason,
    };

    // -------------------------------------------------------------------------
    // Build a reusable, filterable IQueryable for Course
    // -------------------------------------------------------------------------
    private IQueryable<Course> BuildCourseQuery(int? instructorId, string? status, int? categoryId, string? search)
    {
        var query = _courseRepository.GetQueryable()
            .Include(c => c.Category)
            .Include(c => c.Instructor)
            .Include(c => c.ApprovedBy)
            .AsQueryable();

        // Filter by instructor (for instructor's own courses view)
        if (instructorId.HasValue)
            query = query.Where(c => c.InstructorId == instructorId.Value);

        // Filter by status (convert string → enum for comparison)
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<CourseStatus>(status, true, out var parsedStatus))
            query = query.Where(c => c.Status == parsedStatus);

        // Filter by category
        if (categoryId.HasValue)
            query = query.Where(c => c.CategoryId == categoryId.Value);

        // Full-text search on Title
        if (!string.IsNullOrEmpty(search))
            query = query.Where(c => c.Title.ToLower().Contains(search.ToLower()));

        return query.OrderByDescending(c => c.UpdatedAt);
    }

    // -------------------------------------------------------------------------
    // GET Instructor's own courses (paginated)
    // -------------------------------------------------------------------------
    public async Task<CourseListResponse> GetInstructorCoursesAsync(
       int instructorId, int page, int limit, string? status, int? categoryId, string? search)
    {
        var query = BuildCourseQuery(instructorId, status, categoryId, search);
        return await ExecutePaginatedQueryAsync(query, page, limit);
    }
    // -------------------------------------------------------------------------
    // Execute pagination — shared between both list methods
    // -------------------------------------------------------------------------
    private static async Task<CourseListResponse> ExecutePaginatedQueryAsync(
        IQueryable<Course> query, int page, int limit)
    {
        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return new CourseListResponse
        {
            Data = items.Select(MapToDto).ToList(),
            Pagination = new PaginationMeta
            {
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            }
        };
    }

    // -------------------------------------------------------------------------
    // GET All courses — Admin only
    // -------------------------------------------------------------------------
    public async Task<CourseListResponse> GetAllCoursesAsync(
        int page, int limit, string? status, int? categoryId, string? search)
    {
        var query = BuildCourseQuery(null, status, categoryId, search);
        return await ExecutePaginatedQueryAsync(query, page, limit);
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
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            }
        };
    }

    // -------------------------------------------------------------------------
    // GET single course by ID
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> GetCourseByIdAsync(int courseId)
    {
        var course = await _courseRepository.GetQueryable()
            .Include(c => c.Category)
            .Include(c => c.Instructor)
            .Include(c => c.ApprovedBy)
            .FirstOrDefaultAsync(c => c.CourseId == courseId);

        return course is null ? null : MapToDto(course);
    }

    // -------------------------------------------------------------------------
    // CREATE course
    // -------------------------------------------------------------------------
    private async Task ValidateCourseForApprovalAsync(int courseId, Course course)
    {
        var missingRequirements = new List<string>();

        if (string.IsNullOrWhiteSpace(course.Title))
            missingRequirements.Add("Tên khóa học");

        if (!course.CategoryId.HasValue || course.CategoryId.Value <= 0)
            missingRequirements.Add("Danh mục khóa học");

        if (string.IsNullOrWhiteSpace(course.Description))
            missingRequirements.Add("Mô tả khóa học");

        var hasModules = await _moduleRepository.AnyAsync(m => m.CourseId == courseId);
        if (!hasModules)
            missingRequirements.Add("Chương học (Module)");

        var hasLessons = await _lessonRepository.AnyAsync(l => l.CourseId == courseId);
        if (!hasLessons)
            missingRequirements.Add("Bài học (Lesson)");

        var hasSpeakingAssignment = await _lessonRepository.AnyAsync(l => l.CourseId == courseId && l.LessonType == LessonType.ASSIGNMENT);
        if (!hasSpeakingAssignment)
            missingRequirements.Add("Bài tập nói cuối khóa (Speaking Assignment)");

        if (missingRequirements.Any())
        {
            throw new InvalidOperationException($"Chưa thể gửi Admin duyệt. Khóa học còn thiếu: {string.Join(", ", missingRequirements)}.");
        }
    }

    public async Task<CourseDto?> CreateCourseAsync(int instructorId, CreateCourseRequest request)
    {
        // Validate the CategoryId FK if provided. If not exists, set to null instead of failing completely.
        if (request.CategoryId.HasValue)
        {
            var catExists = await _categoryRepository.AnyAsync(c => c.CategoryId == request.CategoryId.Value);
            if (!catExists)
            {
                request.CategoryId = null; // Default to unassigned category if invalid CategoryId provided
            }
        }

        if (request.SubmitForApproval)
        {
            throw new InvalidOperationException("Khóa học mới tạo chưa có Chương học và Bài học. Hãy tạo khóa học trước, sau đó thêm Chương & Bài học đầy đủ mới có thể gửi Admin duyệt.");
        }

        // Force new/imported course status to DRAFT regardless of client request (must be approved by Admin to publish)
        var status = CourseStatus.DRAFT;

        var course = new Course
        {
            InstructorId = instructorId,
            CategoryId = request.CategoryId,
            Title = request.Title,
            Slug = GenerateSlug(request.Title),
            Description = request.Description,
            ThumbnailUrl = request.ThumbnailUrl,
            Price = request.Price,
            Level = request.Level,
            Status = status,
            SubmissionNote = request.SubmissionNote,
            SubmittedAt = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
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
            course.Slug = GenerateSlug(request.Title); // Re-generate slug when title changes
        }
        if (request.Description is not null) course.Description = request.Description;
        if (request.CategoryId.HasValue) course.CategoryId = request.CategoryId;
        if (request.ThumbnailUrl is not null) course.ThumbnailUrl = request.ThumbnailUrl;
        if (request.Price.HasValue) course.Price = request.Price.Value;
        if (request.Level.HasValue) course.Level = request.Level;
        if (request.Status.HasValue)
        {
            // Instructors cannot directly publish courses; any edit defaults to DRAFT unless submitted for approval
            course.Status = request.Status.Value == CourseStatus.PUBLISHED ? CourseStatus.DRAFT : request.Status.Value;
        }

        if (request.SubmitForApproval || (request.Status.HasValue && request.Status.Value == CourseStatus.PENDING_APPROVAL))
        {
            await ValidateCourseForApprovalAsync(courseId, course);
            course.Status = CourseStatus.PENDING_APPROVAL;
            course.SubmittedAt = DateTime.UtcNow;
            if (request.SubmissionNote is not null)
                course.SubmissionNote = request.SubmissionNote;
        }

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
    public async Task<CourseDto?> UpdateCourseStatusAsync(int courseId, int currentUserId, string newStatus, string? reason = null)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return null;

        if (!Enum.TryParse<CourseStatus>(newStatus, true, out var parsedStatus))
            return null; // Invalid status string

        if (parsedStatus == CourseStatus.PENDING_APPROVAL)
        {
            await ValidateCourseForApprovalAsync(courseId, course);
            course.SubmittedAt = DateTime.UtcNow;
        }
        else if (parsedStatus == CourseStatus.PUBLISHED)
        {
            course.ApprovedAt = DateTime.UtcNow;
            course.ApprovedById = currentUserId;
            course.RejectionReason = null;
        }
        else if (parsedStatus == CourseStatus.REJECTED)
        {
            course.ApprovedAt = DateTime.UtcNow;
            course.ApprovedById = currentUserId;
            if (!string.IsNullOrEmpty(reason))
                course.RejectionReason = reason;
        }

        course.Status = parsedStatus;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // Submit for Admin Approval
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> SubmitForApprovalAsync(int courseId, int instructorId, string? submissionNote)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null || course.InstructorId != instructorId)
            return null;

        await ValidateCourseForApprovalAsync(courseId, course);

        course.Status = CourseStatus.PENDING_APPROVAL;
        course.SubmittedAt = DateTime.UtcNow;
        if (submissionNote is not null)
            course.SubmissionNote = submissionNote;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // Admin Approve Course
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> ApproveCourseAsync(int courseId, int adminId)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return null;

        if (course.Status != CourseStatus.PENDING_APPROVAL)
            throw new InvalidOperationException("Chỉ có thể phê duyệt khóa học khi đang ở trạng thái Chờ duyệt.");

        course.Status = CourseStatus.PUBLISHED;
        course.ApprovedAt = DateTime.UtcNow;
        course.ApprovedById = adminId;
        course.RejectionReason = null;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // Admin Reject Course
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> RejectCourseAsync(int courseId, int adminId, string reason)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return null;

        if (course.Status != CourseStatus.PENDING_APPROVAL)
            throw new InvalidOperationException("Chỉ có thể từ chối khóa học khi đang ở trạng thái Chờ duyệt.");

        course.Status = CourseStatus.REJECTED;
        course.ApprovedAt = DateTime.UtcNow;
        course.ApprovedById = adminId;
        course.RejectionReason = reason;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // Admin Hide Course (Archive)
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> HideCourseAsync(int courseId, int adminId)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return null;

        if (course.Status != CourseStatus.PUBLISHED)
            throw new InvalidOperationException("Chỉ có thể ẩn khóa học đang ở trạng thái Đã xuất bản.");

        course.Status = CourseStatus.ARCHIVED;
        course.UpdatedAt = DateTime.UtcNow;

        _courseRepository.Update(course);
        await _unitOfWork.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // Admin Unhide Course (Republish)
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> UnhideCourseAsync(int courseId, int adminId)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return null;

        if (course.Status != CourseStatus.ARCHIVED && course.Status != CourseStatus.DRAFT)
            throw new InvalidOperationException("Khóa học không ở trạng thái Đã ẩn.");

        course.Status = CourseStatus.PUBLISHED;
        course.ApprovedAt = DateTime.UtcNow;
        course.ApprovedById = adminId;
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
            req.Status = CourseStatus.DRAFT;
            req.SubmitForApproval = false;
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


