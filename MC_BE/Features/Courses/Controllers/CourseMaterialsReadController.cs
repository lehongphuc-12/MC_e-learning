using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using MC_BE.Core.Enums;
using MC_BE.Shared.Services.Interfaces;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api/courses/{courseId:int}/materials")]
[Authorize]
public class CourseMaterialsReadController : ControllerBase
{
    private readonly SmartMcDbContext _db;
    private readonly IR2StorageService _r2;
    public CourseMaterialsReadController(SmartMcDbContext db, IR2StorageService r2)
    {
        _db = db;
        _r2 = r2;
    }

    [HttpGet]
    public async Task<IActionResult> GetMaterials(int courseId, CancellationToken ct)
    {
        var rawId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!int.TryParse(rawId, out var userId)) return Unauthorized();
        var course = await _db.Courses.AsNoTracking().Where(c => c.CourseId == courseId)
            .Select(c => new { c.CourseId, c.InstructorId }).FirstOrDefaultAsync(ct);
        if (course == null) return NotFound();
        var now = DateTime.UtcNow;
        var isEnrolled = await _db.Enrollments.AsNoTracking().AnyAsync(e => e.CourseId == courseId && e.LearnerId == userId &&
            (e.Status == "ACTIVE" || e.Status == "COMPLETED") && (!e.ExpiresAt.HasValue || e.ExpiresAt > now), ct);
        var isStaff = User.IsInRole("Admin");
        if (!isEnrolled && course.InstructorId != userId && !isStaff) return Forbid();
        var materials = await _db.CourseMaterials.AsNoTracking()
            .Where(m => m.CourseId == courseId || (m.LessonId != null && _db.Lessons.Any(l => l.LessonId == m.LessonId && l.CourseId == courseId)))
            .OrderBy(m => m.MaterialId)
            .ToListAsync(ct);
        var items = materials.Select(m =>
        {
            var key = m.ObjectKey ?? _r2.ExtractKeyFromUrl(m.FileUrl);
            // Video materials are only exposed through a short-lived R2 URL when an object key exists.
            // Legacy Drive/YouTube links are intentionally withheld now that lesson videos use private uploads.
            var isVideo = m.MaterialType == MaterialType.VIDEO;
            var url = isVideo
                ? (string.IsNullOrWhiteSpace(key) ? null : _r2.GetPresignedUrl(key, 6))
                : m.FileUrl;
            return new { materialId = m.MaterialId, lessonId = m.LessonId, title = m.Title, fileUrl = url, materialType = m.MaterialType?.ToString() };
        });
        return Ok(new { success = true, data = items });
    }
}
