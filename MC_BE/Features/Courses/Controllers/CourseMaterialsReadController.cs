using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api/courses/{courseId:int}/materials")]
[Authorize]
public class CourseMaterialsReadController : ControllerBase
{
    private readonly SmartMcDbContext _db;
    public CourseMaterialsReadController(SmartMcDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetMaterials(int courseId, CancellationToken ct)
    {
        var rawId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!int.TryParse(rawId, out var userId)) return Unauthorized();
        var course = await _db.Courses.AsNoTracking().Where(c => c.CourseId == courseId)
            .Select(c => new { c.CourseId, c.InstructorId }).FirstOrDefaultAsync(ct);
        if (course == null) return NotFound();
        var isEnrolled = await _db.Enrollments.AsNoTracking().AnyAsync(e => e.CourseId == courseId && e.LearnerId == userId && e.Status != "PENDING_PAYMENT", ct);
        var isStaff = User.IsInRole("Admin");
        if (!isEnrolled && course.InstructorId != userId && !isStaff) return Forbid();
        var items = await _db.CourseMaterials.AsNoTracking()
            .Where(m => m.CourseId == courseId || (m.LessonId != null && _db.Lessons.Any(l => l.LessonId == m.LessonId && l.CourseId == courseId)))
            .OrderBy(m => m.MaterialId)
            .Select(m => new { materialId = m.MaterialId, lessonId = m.LessonId, title = m.Title, fileUrl = m.FileUrl, materialType = m.MaterialType == null ? null : m.MaterialType.ToString() })
            .ToListAsync(ct);
        return Ok(new { success = true, data = items });
    }
}
