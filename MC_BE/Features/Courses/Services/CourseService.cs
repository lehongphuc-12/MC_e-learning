using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace MC_BE.Features.Courses.Services;

/// <summary>
/// Implements all Course CRUD operations.
/// Uses SmartMcDbContext directly (instead of the generic repository) because
/// we need EF Core's Include() and complex LINQ filtering — the generic repo
/// doesn't support that cleanly without breaking its abstraction.
/// </summary>
public class CourseService : ICourseService
{
    private readonly SmartMcDbContext _context;

    public CourseService(SmartMcDbContext context)
    {
        _context = context;
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

    // -------------------------------------------------------------------------
    // Build a reusable, filterable IQueryable for Course
    // WHY private? Both GetInstructorCoursesAsync and GetAllCoursesAsync share
    // the same filter logic — extracting it avoids duplication.
    // -------------------------------------------------------------------------
    private IQueryable<Course> BuildCourseQuery(int? instructorId, string? status, int? categoryId, string? search)
    {
        var query = _context.Courses
            .Include(c => c.Category)
            .Include(c => c.Instructor)
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
        var course = await _context.Courses
            .Include(c => c.Category)
            .Include(c => c.Instructor)
            .FirstOrDefaultAsync(c => c.CourseId == courseId);

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
            var catExists = await _context.Categories.AnyAsync(c => c.CategoryId == request.CategoryId.Value);
            if (!catExists) return null; // Let caller decide the error response
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

        _context.Courses.Add(course);
        await _context.SaveChangesAsync();

        // Reload with includes so the returned DTO has CategoryName/InstructorName
        return await GetCourseByIdAsync(course.CourseId);
    }

    // -------------------------------------------------------------------------
    // UPDATE course (partial — only updates non-null fields)
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> UpdateCourseAsync(int courseId, int instructorId, UpdateCourseRequest request)
    {
        var course = await _context.Courses.FindAsync(courseId);

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

        await _context.SaveChangesAsync();
        return await GetCourseByIdAsync(courseId);
    }

    // -------------------------------------------------------------------------
    // DELETE course
    // -------------------------------------------------------------------------
    public async Task<bool> DeleteCourseAsync(int courseId, int instructorId)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course is null || course.InstructorId != instructorId)
            return false;

        _context.Courses.Remove(course);
        await _context.SaveChangesAsync();
        return true;
    }

    // -------------------------------------------------------------------------
    // PATCH status (quick toggle from table row)
    // -------------------------------------------------------------------------
    public async Task<CourseDto?> UpdateCourseStatusAsync(int courseId, int instructorId, string newStatus)
    {
        var course = await _context.Courses.FindAsync(courseId);
        if (course is null || course.InstructorId != instructorId)
            return null;

        if (!Enum.TryParse<CourseStatus>(newStatus, true, out var parsedStatus))
            return null; // Invalid status string

        course.Status    = parsedStatus;
        course.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
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
}
