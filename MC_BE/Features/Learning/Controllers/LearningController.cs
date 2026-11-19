
using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Learning.Controllers;

/// <summary>
/// API Controller quản lý tiến độ học tập, nhật ký hoạt động và Gamification Streak của học viên.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LearningController : ControllerBase
{
    private readonly ILearningProgressService _learningProgressService;
    private readonly SmartMcDbContext _db;

    /// <summary>
    /// Khởi tạo Controller với LearningProgressService và SmartMcDbContext được inject từ DI Container.
    /// </summary>
    public LearningController(ILearningProgressService learningProgressService, SmartMcDbContext db)
    {
        _learningProgressService = learningProgressService;
        _db = db;
    }

    /// <summary>
    /// - Hàm tiện ích (Private Helper) trích xuất ID người dùng từ Claims trong JWT Token đã giải mã.
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu token không hợp lệ.</returns>
    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/learning/history - Read-only learning history, including expired enrollments.
    /// Does not grant access to lessons, videos, or new submissions.
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetLearningHistory()
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null) return Unauthorized();

        var now = DateTime.UtcNow;
        var enrollments = await _db.Enrollments.AsNoTracking()
            .Where(e => e.LearnerId == learnerId.Value &&
                (e.Status == "ACTIVE" || e.Status == "COMPLETED" || e.Status == "EXPIRED"))
            .OrderByDescending(e => e.EnrolledAt ?? e.CreatedAt)
            .Select(e => new {
                e.EnrollmentId, e.CourseId, CourseTitle = e.Course.Title,
                e.Status, e.ExpiresAt, e.CompletionPercentage, e.EnrolledAt
            }).ToListAsync();

        var courseIds = enrollments.Select(e => e.CourseId).Distinct().ToList();
        var quizzes = await _db.Quizzes.AsNoTracking()
            .Where(q => (q.CourseId.HasValue && courseIds.Contains(q.CourseId.Value)) ||
                (q.LessonId.HasValue && _db.Lessons.Any(l => l.LessonId == q.LessonId.Value && courseIds.Contains(l.CourseId))) ||
                (q.ModuleId.HasValue && _db.Modules.Any(m => m.ModuleId == q.ModuleId.Value && courseIds.Contains(m.CourseId))))
            .Select(q => new { q.QuizId, q.Title, q.CourseId, LessonCourseId = q.Lesson != null ? (int?)q.Lesson.CourseId : null,
                ModuleCourseId = q.ModuleId.HasValue ? _db.Modules.Where(m => m.ModuleId == q.ModuleId.Value).Select(m => (int?)m.CourseId).FirstOrDefault() : null })
            .ToListAsync();
        var quizIds = quizzes.Select(q => q.QuizId).ToList();
        var attempts = await _db.QuizAttempts.AsNoTracking()
            .Where(a => a.UserId == learnerId.Value && a.SubmittedAt.HasValue && quizIds.Contains(a.QuizId))
            .OrderByDescending(a => a.SubmittedAt)
            .Select(a => new { a.QuizId, a.AttemptId, a.AttemptNumber, a.Score,
                ResultStatus = a.ResultStatus.ToString(), a.SubmittedAt })
            .ToListAsync();

        var speaking = await _db.SpeakingSubmissions.AsNoTracking()
            .Where(s => s.LearnerId == learnerId.Value &&
                ((s.Lesson != null && courseIds.Contains(s.Lesson.CourseId)) ||
                 (s.SpeakingScript != null && courseIds.Contains(s.SpeakingScript.CourseId))))
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new { s.SubmissionId, s.ScriptId, s.LessonId,
                CourseId = s.Lesson != null ? s.Lesson.CourseId : s.SpeakingScript!.CourseId,
                Title = s.SpeakingScript != null ? s.SpeakingScript.Title : (s.Lesson != null ? s.Lesson.Title : "Bài luyện nói"),
                s.Score, Status = s.Status.ToString(), s.Feedback, s.SubmittedAt })
            .ToListAsync();
        var progresses = await _db.LessonProgresses.AsNoTracking()
            .Where(p => p.Enrollment.LearnerId == learnerId.Value && courseIds.Contains(p.Lesson.CourseId))
            .Select(p => new { p.EnrollmentId, p.LessonId, LessonTitle = p.Lesson.Title,
                p.IsCompleted, Status = p.Status.ToString(), p.CompletedAt, p.TimeSpentMinutes })
            .ToListAsync();

        var result = enrollments.Select(e => new {
            e.EnrollmentId, e.CourseId, e.CourseTitle, e.Status, e.ExpiresAt,
            IsExpired = e.Status == "EXPIRED" || (e.ExpiresAt.HasValue && e.ExpiresAt.Value <= now),
            e.CompletionPercentage, e.EnrolledAt,
            QuizAttempts = attempts.Join(quizzes.Where(q => (q.CourseId ?? q.LessonCourseId ?? q.ModuleCourseId) == e.CourseId),
                a => a.QuizId, q => q.QuizId,
                (a, q) => new { a.QuizId, QuizTitle = q.Title, a.AttemptId, a.AttemptNumber, a.Score, a.ResultStatus, a.SubmittedAt }).ToList(),
            SpeakingSubmissions = speaking.Where(s => s.CourseId == e.CourseId).ToList(),
            LessonProgresses = progresses.Where(p => p.EnrollmentId == e.EnrollmentId).ToList()
        }).ToList();
        return Ok(ApiResponse<object>.SuccessResponse(result, "Learning history retrieved successfully."));
    }

    /// <summary>
    /// GET /api/learning/courses/{courseId}/progress
    /// Lấy thông tin tiến độ học tập tổng thể của học viên trong một khóa học cụ thể.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>ApiResponse chứa CourseLearningProgressDto.</returns>
    [HttpGet("courses/{courseId:int}/progress")]
    public async Task<ActionResult<ApiResponse<CourseLearningProgressDto>>> GetCourseProgress(int courseId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CourseLearningProgressDto>.FailureResponse("Unauthorized."));
        }

        var progress = await _learningProgressService.GetCourseProgressAsync(learnerId.Value, courseId);
        if (progress == null)
        {
            return NotFound(ApiResponse<CourseLearningProgressDto>.FailureResponse("Learner enrollment or course not found."));
        }

        return Ok(ApiResponse<CourseLearningProgressDto>.SuccessResponse(progress, "Course progress retrieved successfully."));
    }

    /// <summary>
    /// PUT /api/learning/lessons/{lessonId}/progress
    /// Cập nhật tiến độ của một bài học (vị trí phát video, thời gian học tích lũy, trạng thái hoàn thành).
    /// Phương thức có tính Bất biến / Chống trùng lặp (Idempotent).
    /// </summary>
    /// <param name="lessonId">ID bài học cần cập nhật.</param>
    /// <param name="request">Payload chứa thông tin tiến độ.</param>
    /// <returns>ApiResponse chứa CourseLearningProgressDto mới nhất.</returns>
    [HttpPut("lessons/{lessonId:int}/progress")]
    public async Task<ActionResult<ApiResponse<CourseLearningProgressDto>>> UpdateLessonProgress(
        int lessonId, [FromBody] UpdateLessonProgressRequest request)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CourseLearningProgressDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            var updatedProgress = await _learningProgressService.UpdateLessonProgressAsync(learnerId.Value, lessonId, request);
            if (updatedProgress == null)
                return NotFound(ApiResponse<CourseLearningProgressDto>.FailureResponse("Lesson or active enrollment not found."));

            return Ok(ApiResponse<CourseLearningProgressDto>.SuccessResponse(updatedProgress, "Lesson progress updated successfully."));
        }
        catch (InvalidOperationException ex)
        {
            // Access denials are not internal server failures.
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<CourseLearningProgressDto>.FailureResponse(ex.Message));
        }
    }

    /// <summary>
    /// GET /api/learning/activity-logs
    /// Lấy danh sách các hoạt động học tập gần đây nhất của học viên trên toàn hệ thống.
    /// </summary>
    /// <param name="limit">Số lượng hoạt động tối đa (mặc định 10).</param>
    /// <returns>ApiResponse chứa danh sách ActivityLogDto.</returns>
    [HttpGet("activity-logs")]
    public async Task<ActionResult<ApiResponse<List<ActivityLogDto>>>> GetActivityLogs([FromQuery] int limit = 10)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<List<ActivityLogDto>>.FailureResponse("Unauthorized."));
        }

        var activities = await _learningProgressService.GetRecentActivitiesAsync(learnerId.Value, limit);
        return Ok(ApiResponse<List<ActivityLogDto>>.SuccessResponse(activities, "Retrieved activity logs successfully."));
    }

    /// <summary>
    /// GET /api/learning/streak
    /// Lấy chỉ số Gamification chuỗi ngày học liên tục (Learning Streak) của học viên theo múi giờ Việt Nam (UTC+7).
    /// </summary>
    /// <returns>ApiResponse chứa LearningStreakDto (CurrentStreak, LongestStreak).</returns>
    [HttpGet("streak")]
    public async Task<ActionResult<ApiResponse<LearningStreakDto>>> GetLearningStreak()
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<LearningStreakDto>.FailureResponse("Unauthorized."));
        }

        var streak = await _learningProgressService.GetLearningStreakAsync(learnerId.Value);
        return Ok(ApiResponse<LearningStreakDto>.SuccessResponse(streak, "Retrieved streak successfully."));
    }
}
