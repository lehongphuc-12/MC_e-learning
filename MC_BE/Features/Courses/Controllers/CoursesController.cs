using MC_BE.Core.DTOs;
using MC_BE.Features.Admin.Services;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Courses.Controllers;

/// <summary>
/// CoursesController — handles all course CRUD for Instructor and Admin roles.
///
/// Routes:
///   GET    /api/courses/my-courses         → Instructor's own courses (paginated)
///   GET    /api/courses/:id                → Single course detail
///   POST   /api/courses                    → Create new course (Instructor)
///   PUT    /api/courses/:id                → Update course (Instructor)
///   DELETE /api/courses/:id                → Delete course (Instructor)
///   PATCH  /api/courses/:id/status         → Quick status toggle
///   GET    /api/admin/courses              → All courses (Admin) — see AdminCoursesController
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize] // All endpoints require authentication by default
public class CoursesController : ControllerBase
{
    private readonly ICourseService _courseService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ICourseRecommendationService _recommendationService;
    private readonly AdminActivityLogger _activityLogger;

    public CoursesController(
        ICourseService courseService,
        ICloudinaryService cloudinaryService,
        ICourseRecommendationService recommendationService,
        AdminActivityLogger activityLogger)
    {
        _courseService = courseService;
        _cloudinaryService = cloudinaryService;
        _recommendationService = recommendationService;
        _activityLogger = activityLogger;
    }

    // ── Helper: extract InstructorID from JWT claims ──────────────────────────
    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/courses/recommendations?top=3
    /// Trả về danh sách top khóa học có TotalScore cao nhất cho học viên (loại bỏ các khóa đã sở hữu),
    /// kèm đầy đủ thông tin thẻ khóa học và lý do đề xuất giải thích được (Explainable Reason).
    /// </summary>
    [HttpGet("recommendations")]
    public async Task<ActionResult<ApiResponse<List<CourseRecommendationDto>>>> GetRecommendations(
        [FromQuery] int? top,
        [FromQuery] int? limit)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<List<CourseRecommendationDto>>.FailureResponse("Vui lòng đăng nhập để nhận đề xuất khóa học."));

        int count = top ?? limit ?? 3;
        if (count <= 0) count = 3;

        var result = await _recommendationService.GetTopRecommendationsAsync(userId.Value, count);
        return Ok(ApiResponse<List<CourseRecommendationDto>>.SuccessResponse(result, "Lấy danh sách khóa học đề xuất thành công."));
    }

    // POST /api/courses/upload-thumbnail — upload a course cover image to Cloudinary.
    [HttpPost("upload-thumbnail")]
    [Authorize(Roles = "Instructor")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<string>>> UploadThumbnail(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(ApiResponse<string>.FailureResponse("Vui lòng chọn ảnh cần tải lên."));

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(ApiResponse<string>.FailureResponse("Ảnh không được vượt quá 5 MB."));

        var allowedTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/webp", "image/gif"
        };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(ApiResponse<string>.FailureResponse("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF."));

        try
        {
            var result = await _cloudinaryService.UploadImageAsync(file, "mc_elearning/course_thumbnails");
            var url = result.SecureUrl?.AbsoluteUri;
            if (result.Error is not null || string.IsNullOrWhiteSpace(url))
                return StatusCode(502, ApiResponse<string>.FailureResponse("Không thể tải ảnh lên Cloudinary."));

            return Ok(ApiResponse<string>.SuccessResponse(url, "Tải ảnh khóa học thành công."));
        }
        catch (Exception)
        {
            return StatusCode(502, ApiResponse<string>.FailureResponse("Tải ảnh lên Cloudinary thất bại. Vui lòng thử lại."));
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/courses
    // Public endpoint to get all courses (paginated, filtered, searched)
    // Query params: page, limit, status, categoryId, search
    // -------------------------------------------------------------------------
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CourseListResponse>>> GetCourses(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? status = null,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? search = null)
    {
        var result = await _courseService.GetAllCoursesAsync(page, limit, status, categoryId, search);
        return Ok(ApiResponse<CourseListResponse>.SuccessResponse(result));
    }

    [HttpGet("{id:int}/preview-lesson")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CoursePreviewLessonDto>>> GetPreviewLesson(int id)
    {
        var lesson = await _courseService.GetFirstPreviewLessonAsync(id);
        if (lesson is null)
            return NotFound(ApiResponse<CoursePreviewLessonDto>.FailureResponse("Khóa học chưa có bài video được bật xem trước."));

        return Ok(ApiResponse<CoursePreviewLessonDto>.SuccessResponse(lesson));
    }

    // -------------------------------------------------------------------------
    // GET /api/courses/my-courses
    // Returns the authenticated instructor's own courses.
    // Query params: page, limit, status, categoryId, search
    // -------------------------------------------------------------------------
    [HttpGet("my-courses")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseListResponse>>> GetMyCourses(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? status = null,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? search = null)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseListResponse>.FailureResponse("Unauthorized."));

        var result = await _courseService.GetInstructorCoursesAsync(
            instructorId.Value, page, limit, status, categoryId, search);

        return Ok(ApiResponse<CourseListResponse>.SuccessResponse(result));
    }

    // -------------------------------------------------------------------------
    // GET /api/courses/learned-courses
    // Returns the authenticated learner's enrolled courses with progress & details.
    // -------------------------------------------------------------------------
    [HttpGet("learned-courses")]
    public async Task<ActionResult<ApiResponse<List<LearnedCourseDto>>>> GetLearnedCourses()
    {
        var learnerId = GetCurrentUserId();
        if (learnerId is null)
            return Unauthorized(ApiResponse<List<LearnedCourseDto>>.FailureResponse("Unauthorized."));

        var result = await _courseService.GetLearnedCoursesAsync(learnerId.Value);
        return Ok(ApiResponse<List<LearnedCourseDto>>.SuccessResponse(result));
    }


    // -------------------------------------------------------------------------
    // GET /api/courses/{id}
    // Returns a single course (accessible to authenticated users)
    // -------------------------------------------------------------------------
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> GetCourse(int id)
    {
        var course = await _courseService.GetCourseByIdAsync(id);
        if (course is null)
            return NotFound(ApiResponse<CourseDto>.FailureResponse($"Course with ID {id} not found."));

        return Ok(ApiResponse<CourseDto>.SuccessResponse(course));
    }

    // -------------------------------------------------------------------------
    // POST /api/courses
    // Creates a new course. InstructorID is taken from the JWT (not the body).
    // -------------------------------------------------------------------------
    [HttpPost]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> CreateCourse([FromBody] CreateCourseRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<CourseDto>.FailureResponse("Validation failed.", errors));
        }

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        try
        {
            var created = await _courseService.CreateCourseAsync(instructorId.Value, request);
            if (created is null)
                return BadRequest(ApiResponse<CourseDto>.FailureResponse("Invalid category ID or creation failed."));

            // 201 Created with Location header pointing to the new resource
            return CreatedAtAction(nameof(GetCourse), new { id = created.CourseId },
                ApiResponse<CourseDto>.SuccessResponse(created, "Course created successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CourseDto>.FailureResponse(ex.Message));
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/courses/bulk
    // Creates multiple courses in bulk.
    // -------------------------------------------------------------------------
    [HttpPost("bulk")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<List<CourseDto>>>> CreateCoursesBulk([FromBody] List<CreateCourseRequest> requests)
    {
        if (requests == null || !requests.Any())
            return BadRequest(ApiResponse<List<CourseDto>>.FailureResponse("No course data provided."));

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<List<CourseDto>>.FailureResponse("Unauthorized."));

        var results = await _courseService.CreateCoursesBulkAsync(instructorId.Value, requests);
        return Ok(ApiResponse<List<CourseDto>>.SuccessResponse(results, $"Successfully imported {results.Count} courses."));
    }

    // -------------------------------------------------------------------------
    // PUT /api/courses/{id}
    // Updates a course. Only the course owner can update it.
    // -------------------------------------------------------------------------
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> UpdateCourse(
        int id, [FromBody] UpdateCourseRequest request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<CourseDto>.FailureResponse("Validation failed.", errors));
        }

        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        try
        {
            var updated = await _courseService.UpdateCourseAsync(id, instructorId.Value, request);
            if (updated is null)
                return NotFound(ApiResponse<CourseDto>.FailureResponse("Course not found or you are not the owner."));

            return Ok(ApiResponse<CourseDto>.SuccessResponse(updated, "Course updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CourseDto>.FailureResponse(ex.Message));
        }
    }

    // -------------------------------------------------------------------------
    // DELETE /api/courses/{id}
    // Hard-deletes a course. Only the owner can delete.
    // -------------------------------------------------------------------------
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDeletionActionDto>>> DeleteCourse(int id)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDeletionActionDto>.FailureResponse("Unauthorized."));

        try
        {
            var result = await _courseService.DeleteCourseAsync(id, instructorId.Value);
            if (result is null)
                return NotFound(ApiResponse<CourseDeletionActionDto>.FailureResponse("Course not found or you are not the owner."));
            return Ok(ApiResponse<CourseDeletionActionDto>.SuccessResponse(result, result.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<CourseDeletionActionDto>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:int}/deletion-request")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDeletionActionDto>>> RequestCourseDeletion(
        int id, [FromBody] RequestCourseDeletionRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDeletionActionDto>.FailureResponse("Unauthorized."));

        try
        {
            var result = await _courseService.RequestCourseDeletionAsync(id, instructorId.Value, request.Reason);
            if (result is null)
                return NotFound(ApiResponse<CourseDeletionActionDto>.FailureResponse("Course not found or you are not the owner."));
            return Ok(ApiResponse<CourseDeletionActionDto>.SuccessResponse(result, result.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CourseDeletionActionDto>.FailureResponse(ex.Message));
        }

    }

    // -------------------------------------------------------------------------
    // PATCH /api/courses/{id}/status
    // Quick status toggle — DRAFT ↔ PUBLISHED ↔ ARCHIVED
    // -------------------------------------------------------------------------
    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> UpdateCourseStatus(
        int id, [FromBody] UpdateCourseStatusRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        try
        {
            var updated = await _courseService.UpdateCourseStatusAsync(
                id, instructorId.Value, request.Status.ToString(), request.Reason);

            if (updated is null)
                return NotFound(ApiResponse<CourseDto>.FailureResponse("Course not found or you are not the owner."));

            return Ok(ApiResponse<CourseDto>.SuccessResponse(updated, $"Course status updated to {request.Status}."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CourseDto>.FailureResponse(ex.Message));
        }
    }

    // -------------------------------------------------------------------------
    // POST /api/courses/{id}/submit-approval
    // Instructor submits course for admin review with an optional note
    // -------------------------------------------------------------------------
    [HttpPost("{id:int}/submit-approval")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseDto>>> SubmitForApproval(
        int id, [FromBody] SubmitApprovalRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseDto>.FailureResponse("Unauthorized."));

        try
        {
            var updated = await _courseService.SubmitForApprovalAsync(
                id,
                instructorId.Value,
                request.SubmissionNote,
                request.KeepApprovedSyllabus);
            if (updated is null)
                return NotFound(ApiResponse<CourseDto>.FailureResponse("Course not found or you are not the owner."));

            var courseTitle = updated.Title.Length > 220 ? $"{updated.Title[..217]}..." : updated.Title;
            await _activityLogger.RecordAsync(
                instructorId.Value,
                "COURSE_SUBMITTED_FOR_APPROVAL",
                "COURSE",
                id.ToString(),
                $"Giảng viên gửi khóa học '{courseTitle}' để Admin phê duyệt.",
                HttpContext.TraceIdentifier);

            return Ok(ApiResponse<CourseDto>.SuccessResponse(updated, "Khóa học đã được gửi cho Admin phê duyệt."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CourseDto>.FailureResponse(ex.Message));
        }
    }
}
