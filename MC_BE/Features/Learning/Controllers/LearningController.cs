// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Learning/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API.
// - Định tuyến: [Route("api/[controller]")] tương ứng URL /api/learning.
// - Trang trí: [Authorize] (Yêu cầu 100% các Endpoint phải có JWT Token hợp lệ).
// - Vai trò: Tiếp nhận các yêu cầu cập nhật và tra cứu tiến độ học tập từ Web Video Player,
//   bảng theo dõi Gamification Streak, và nhật ký hoạt động cá nhân của học viên.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Trả về dữ liệu tiến độ chi tiết của khóa học (CourseLearningProgressDto).
// - Tiếp nhận tín hiệu Heartbeat định kỳ từ trình phát video để lưu vị trí xem dở và đánh dấu hoàn thành bài học.
// - Cung cấp danh sách hoạt động học tập gần đây (ActivityLogDto) phục vụ trang chủ Dashboard học viên.
// - Cung cấp chỉ số chuỗi ngày học tập (LearningStreakDto) kích thích học tập mỗi ngày.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client Player -> Gọi PUT /api/learning/lessons/{id}/progress.
// - Controller -> Giải mã UserId từ Token -> Gọi ILearningProgressService.
// - ILearningProgressService -> Cập nhật CSDL, tự động tính lại % khóa học và kích hoạt cấp chứng chỉ nếu đạt 100%.
// - Controller bọc kết quả trong ApiResponse<T> -> Trả về Client.
// ====================================================================================================

using System.Security.Claims;
using MC_BE.Core.DTOs;
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

    /// <summary>
    /// Khởi tạo Controller với LearningProgressService được inject từ DI Container.
    /// </summary>
    public LearningController(ILearningProgressService learningProgressService)
    {
        _learningProgressService = learningProgressService;
    }

    /// <summary>
    /// Hàm tiện ích (Private Helper) trích xuất ID người dùng từ Claims trong JWT Token đã giải mã.
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu token không hợp lệ.</returns>
    private int? GetCurrentUserId()
    {
        // [BƯỚC 1]: Đọc Claim NameIdentifier từ HttpContext.User
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/learning/courses/{courseId}/progress
    /// Lấy thông tin tiến độ học tập tổng thể của học viên trong một khóa học cụ thể.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất learnerId từ JWT Token. Nếu null -> Trả về HTTP 401 Unauthorized.</para>
    /// <para>Bước 2: Gọi _learningProgressService.GetCourseProgressAsync(learnerId, courseId).</para>
    /// <para>Bước 3: Nếu kết quả null -> Trả về HTTP 404 Not Found (chưa ghi danh hoặc không có quyền).</para>
    /// <para>Bước 4: Trả về HTTP 200 OK bọc trong ApiResponse CourseLearningProgressDto.</para>
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>ApiResponse chứa CourseLearningProgressDto.</returns>
    /// <summary>
    /// GET /api/learning/courses/{courseId}/progress
    /// Get course learning progress for current learner
    /// </summary>
    [HttpGet("courses/{courseId:int}/progress")]
    public async Task<ActionResult<ApiResponse<CourseLearningProgressDto>>> GetCourseProgress(int courseId)
    {
        // [BƯỚC 1]: Kiểm tra xác thực người dùng
        var learnerId = GetCurrentUserId();
        // Rẽ nhánh: Nếu token không hợp lệ -> Phản hồi 401 Unauthorized
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CourseLearningProgressDto>.FailureResponse("Unauthorized."));
        }

        // [BƯỚC 2]: Gọi Service tính toán tiến độ
        var progress = await _learningProgressService.GetCourseProgressAsync(learnerId.Value, courseId);
        // [BƯỚC 3]: Rẽ nhánh kiểm tra sự tồn tại của lượt ghi danh
        // - Điều kiện: progress == null (Học viên chưa ghi danh khóa học này hoặc không có quyền truy cập).
        // - Xử lý: Phản hồi HTTP 404 Not Found.
        if (progress == null)
        {
            return NotFound(ApiResponse<CourseLearningProgressDto>.FailureResponse("Learner enrollment or course not found."));
        }

        // [BƯỚC 4]: Phản hồi kết quả HTTP 200 OK
        return Ok(ApiResponse<CourseLearningProgressDto>.SuccessResponse(progress, "Course progress retrieved successfully."));
    }

    /// <summary>
    /// PUT /api/learning/lessons/{lessonId}/progress
    /// Cập nhật tiến độ của một bài học (vị trí phát video, thời gian học tích lũy, trạng thái hoàn thành).
    /// Phương thức có tính Bất biến / Chống trùng lặp (Idempotent).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Xác thực danh tính học viên từ JWT Token.</para>
    /// <para>Bước 2: Gọi _learningProgressService.UpdateLessonProgressAsync(learnerId, lessonId, request).</para>
    /// <para>Bước 3: Nếu kết quả null -> Trả về HTTP 404 Not Found (bài học hoặc enrollment không tồn tại).</para>
    /// <para>Bước 4: Trả về HTTP 200 OK kèm CourseLearningProgressDto cập nhật mới nhất.</para>
    /// </summary>
    /// <param name="lessonId">ID bài học cần cập nhật.</param>
    /// <param name="request">Payload chứa thông tin tiến độ.</param>
    /// <returns>ApiResponse chứa CourseLearningProgressDto mới nhất.</returns>
    /// <summary>
    /// PUT /api/learning/lessons/{lessonId}/progress
    /// Update lesson progress idempotently (time spent, video position, completion status)
    /// </summary>
    [HttpPut("lessons/{lessonId:int}/progress")]
    public async Task<ActionResult<ApiResponse<CourseLearningProgressDto>>> UpdateLessonProgress(
        int lessonId, [FromBody] UpdateLessonProgressRequest request)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CourseLearningProgressDto>.FailureResponse("Unauthorized."));
        }

        // Gọi Service cập nhật tiến độ bài học và tính lại tổng tiến độ khóa học
        var updatedProgress = await _learningProgressService.UpdateLessonProgressAsync(learnerId.Value, lessonId, request);
        // Rẽ nhánh: Nếu bài học hoặc lượt ghi danh không hợp lệ
        if (updatedProgress == null)
        {
            return NotFound(ApiResponse<CourseLearningProgressDto>.FailureResponse("Lesson or enrollment not found."));
        }

        return Ok(ApiResponse<CourseLearningProgressDto>.SuccessResponse(updatedProgress, "Lesson progress updated successfully."));
    }

    /// <summary>
    /// GET /api/learning/activity-logs
    /// Lấy danh sách các hoạt động học tập gần đây nhất của học viên trên toàn hệ thống.
    /// <para>End-to-End Flow: Xác thực Token -> Gọi Service GetRecentActivitiesAsync(learnerId, limit) -> Trả về HTTP 200 OK.</para>
    /// </summary>
    /// <param name="limit">Số lượng hoạt động tối đa (mặc định 10).</param>
    /// <returns>ApiResponse chứa danh sách ActivityLogDto.</returns>
    /// <summary>
    /// GET /api/learning/activity-logs
    /// Get recent learning activities for the user
    /// </summary>
    [HttpGet("activity-logs")]
    public async Task<ActionResult<ApiResponse<List<ActivityLogDto>>>> GetActivityLogs([FromQuery] int limit = 10)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<List<ActivityLogDto>>.FailureResponse("Unauthorized."));
        }

        // Gọi Service tổng hợp 7 loại hoạt động học tập
        var activities = await _learningProgressService.GetRecentActivitiesAsync(learnerId.Value, limit);
        return Ok(ApiResponse<List<ActivityLogDto>>.SuccessResponse(activities, "Retrieved activity logs successfully."));
    }

    /// <summary>
    /// GET /api/learning/streak
    /// Lấy chỉ số Gamification chuỗi ngày học liên tục (Learning Streak) của học viên.
    /// <para>End-to-End Flow: Xác thực Token -> Gọi Service GetLearningStreakAsync(learnerId) -> Trả về HTTP 200 OK.</para>
    /// </summary>
    /// <returns>ApiResponse chứa LearningStreakDto (CurrentStreak, LongestStreak).</returns>
    /// <summary>
    /// GET /api/learning/streak
    /// Get learning streak for the user
    /// </summary>
    [HttpGet("streak")]
    public async Task<ActionResult<ApiResponse<LearningStreakDto>>> GetLearningStreak()
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<LearningStreakDto>.FailureResponse("Unauthorized."));
        }

        // Gọi Service tính toán Streak theo múi giờ Việt Nam
        var streak = await _learningProgressService.GetLearningStreakAsync(learnerId.Value);
        return Ok(ApiResponse<LearningStreakDto>.SuccessResponse(streak, "Retrieved streak successfully."));
    }
}
