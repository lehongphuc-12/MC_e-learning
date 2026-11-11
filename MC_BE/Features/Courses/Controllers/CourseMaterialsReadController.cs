
    using MC_BE.Features.Learning.Services.Interfaces;
    using MC_BE.Shared.Data;
    using MC_BE.Shared.Services.Interfaces;
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
        private readonly ILearningAccessService _access;
        private readonly IR2StorageService _r2;

        public CourseMaterialsReadController(
            SmartMcDbContext db,
            ILearningAccessService access,
            IR2StorageService r2)
        {
            _db = db;
            _access = access;
            _r2 = r2;
        }

        [HttpGet]
        public async Task<IActionResult> GetMaterials(
            int courseId,
            CancellationToken ct)
        {
            // Lấy mã người dùng từ thông tin đăng nhập.
            var rawId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("sub")?.Value;

            if (!int.TryParse(rawId, out var userId))
                return Unauthorized();

            // Kiểm tra khóa học có tồn tại hay không.
            var course = await _db.Courses
                .AsNoTracking()
                .Where(c => c.CourseId == courseId)
                .Select(c => new
                {
                    c.CourseId,
                    c.InstructorId
                })
                .FirstOrDefaultAsync(ct);

            if (course == null)
                return NotFound();

            // Kiểm tra trạng thái đăng ký khóa học.
            var now = DateTime.UtcNow;

            var isEnrolled = await _db.Enrollments
                .AsNoTracking()
                .AnyAsync(e =>
                    e.CourseId == courseId &&
                    e.LearnerId == userId &&
                    (e.Status == "ACTIVE" || e.Status == "COMPLETED") &&
                    (!e.ExpiresAt.HasValue || e.ExpiresAt > now),
                    ct);

            var isStaff = User.IsInRole("Admin");
            var isInstructor = course.InstructorId == userId;

            // Chỉ học viên đã đăng ký, giảng viên sở hữu khóa học
            // hoặc Admin mới được xem tài liệu.
            if (!isEnrolled && !isInstructor && !isStaff)
                return Forbid();

            // Lấy danh sách tài liệu của khóa học và các bài học thuộc khóa.
            var materials = await _db.CourseMaterials
                .AsNoTracking()
                .Where(m =>
                    m.CourseId == courseId ||
                    (m.LessonId != null &&
                    _db.Lessons.Any(l =>
                        l.LessonId == m.LessonId &&
                        l.CourseId == courseId)))
                .OrderBy(m => m.MaterialId)
                .ToListAsync(ct);

            // Xử lý đường dẫn tài liệu, bao gồm đường dẫn R2.
            var items = materials.Select(m =>
            {
                var key = m.ObjectKey
                        ?? _r2.ExtractKeyFromUrl(m.FileUrl);

                // Video lưu trên R2 sử dụng đường dẫn truy cập tạm thời.
                // Các nguồn video khác tiếp tục sử dụng đường dẫn ban đầu.
                var url =
                    m.MaterialType == MC_BE.Core.Enums.MaterialType.VIDEO &&
                    !string.IsNullOrWhiteSpace(key)
                        ? _r2.GetPresignedUrl(key, 6)
                        : m.FileUrl;

                return new
                {
                    materialId = m.MaterialId,
                    lessonId = m.LessonId,
                    title = m.Title,
                    fileUrl = url,
                    materialType = m.MaterialType?.ToString()
                };
            }).ToList();

            // Giảng viên và Admin được xem toàn bộ tài liệu.
            if (isInstructor || isStaff)
            {
                return Ok(new
                {
                    success = true,
                    data = items
                });
            }

            // Học viên chỉ được xem tài liệu của bài học đã mở khóa.
            var locks = await _access.GetLessonLocksAsync(
                userId,
                courseId);

            var permitted = items
                .Where(x =>
                    !x.lessonId.HasValue ||
                    (locks.TryGetValue(
                        x.lessonId.Value,
                        out var reason) &&
                    reason == null))
                .ToList();

            return Ok(new
            {
                success = true,
                data = permitted
            });
        }
    }
