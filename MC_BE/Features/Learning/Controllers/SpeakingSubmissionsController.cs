
using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Controllers;

/// <summary>
/// API Controller quản lý nộp bài tập nói, tra cứu kết quả và chấm điểm bài Speaking.
/// </summary>
[ApiController]
[Route("api/speaking-submissions")]
[Authorize]
public class SpeakingSubmissionsController : ControllerBase
{
    private readonly ISpeakingSubmissionService _submissionService;
    private readonly ILogger<SpeakingSubmissionsController> _logger;

    /// <summary>
    /// Khởi tạo Controller với các dependency được inject qua Constructor.
    /// </summary>
    /// <param name="submissionService">Service xử lý logic nghiệp vụ nộp và chấm bài tập nói.</param>
    /// <param name="logger">Dịch vụ ghi log có cấu trúc của hệ thống.</param>
    public SpeakingSubmissionsController(
        ISpeakingSubmissionService submissionService,
        ILogger<SpeakingSubmissionsController> logger)
    {
        _submissionService = submissionService;
        _logger = logger;
    }

    /// <summary>
    /// - Hàm tiện ích (Private Helper) trích xuất ID người dùng đang đăng nhập từ JWT Token Claims.
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu token không hợp lệ.</returns>
    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// POST /api/speaking-submissions
    /// Học viên nộp bài tập nói dưới dạng file âm thanh ghi âm (.mp3, .wav) kèm ghi chú.
    /// Xử lý định dạng Multipart Form-Data.
    /// </summary>
    /// <param name="request">Multipart form chứa file âm thanh, lessonId, scriptId, note.</param>
    /// <returns>ApiResponse chứa thông tin bài nộp SpeakingSubmissionResponseDto.</returns>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> SubmitSpeakingAssignment(
        [FromForm] CreateSpeakingSubmissionRequest request)
    {
        // [BƯỚC 1]: Kiểm tra xác thực người dùng hiện tại
        // - Trích xuất User ID từ ClaimsPrincipal
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            var msg = "Unauthorized: User ID claim not found in JWT token.";
            _logger.LogWarning(msg);
            Console.WriteLine(msg);
            return Unauthorized(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(msg));
        }

        try
        {
            // [BƯỚC 2]: Rẽ nhánh kiểm tra tính hợp lệ của Model
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                var msg = "Validation failed for speaking submission request.";
                _logger.LogWarning("{Message}: {Errors}", msg, string.Join(", ", errors));
                Console.WriteLine($"{msg}: {string.Join(", ", errors)}");
                return BadRequest(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(msg, errors));
            }

            // [BƯỚC 3]: Gọi Service thực hiện nộp bài nói
            // - Hàm được gọi: _submissionService.SubmitSpeakingAssignmentAsync(...)
            // - Tham số truyền vào: learnerId.Value (ID học viên đã xác thực), request (chứa file audio và metadata).
            var result = await _submissionService.SubmitSpeakingAssignmentAsync(learnerId.Value, request);

            // [BƯỚC 4]: Phản hồi kết quả thành công HTTP 200 OK
            // - Gói dữ liệu trong ApiResponse<T>.SuccessResponse kèm thông điệp thông báo nộp bài thành công.
            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(result, "Speaking assignment submitted successfully."));
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Bad Request in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Bad Request] {ex.Message}");
            return BadRequest(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning("Not Found in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Not Found] {ex.Message}");
            return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Conflict/Invalid Operation in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Invalid Operation] {ex.Message}");
            return BadRequest(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Internal Error in SubmitSpeakingAssignment for Learner ID {LearnerId}", learnerId);
            Console.WriteLine($"[SubmitSpeakingAssignment Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("An error occurred while processing your speaking submission."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/lesson/{lessonId}
    /// Lấy bài nộp mới nhất của học viên hiện tại đối với một bài học cụ thể.
    /// </summary>
    /// <param name="lessonId">ID bài học cần tra cứu bài nộp.</param>
    /// <returns>ApiResponse chứa SpeakingSubmissionResponseDto hoặc 404 nếu chưa nộp.</returns>
    [HttpGet("lesson/{lessonId:int}")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> GetLatestSubmissionByLesson(int lessonId)
    {
        // [BƯỚC 1]: Kiểm tra xác thực danh tính học viên
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            // [BƯỚC 2]: Truy vấn bài nộp mới nhất từ Service
            var submission = await _submissionService.GetLatestSubmissionByLessonAsync(learnerId.Value, lessonId);

            // [BƯỚC 3]: Rẽ nhánh kiểm tra kết quả bài nộp
            if (submission == null)
            {
                return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(null!, "No submission yet for this lesson."));
            }

            // [BƯỚC 4]: Phản hồi kết quả thành công HTTP 200 OK
            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(submission, "Submission retrieved successfully."));
        }
        catch (Exception ex)
        {
            // [BƯỚC 5]: Xử lý ngoại lệ ngoài ý muốn -> Trả về HTTP 500
            _logger.LogError(ex, "Error getting submission for Lesson ID {LessonId}", lessonId);
            Console.WriteLine($"[GetLatestSubmissionByLesson Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Failed to retrieve speaking submission."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/script/{scriptId}
    /// Lấy bài nộp mới nhất của học viên hiện tại đối với một kịch bản nói cụ thể.
    /// </summary>
    /// <param name="scriptId">ID kịch bản nói cần tra cứu.</param>
    /// <returns>ApiResponse chứa SpeakingSubmissionResponseDto.</returns>
    [HttpGet("script/{scriptId:int}")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> GetLatestSubmissionByScript(int scriptId)
    {
        // [BƯỚC 1]: Kiểm tra xác thực danh tính học viên
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            // [BƯỚC 2]: Truy vấn bài nộp mới nhất theo kịch bản nói
            var submission = await _submissionService.GetLatestSubmissionByScriptAsync(learnerId.Value, scriptId);

            // [BƯỚC 3]: Rẽ nhánh kiểm tra bài nộp
            if (submission == null)
            {
                return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(null!, "No submission yet for this script."));
            }

            // [BƯỚC 4]: Phản hồi kết quả thành công HTTP 200 OK
            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(submission, "Submission retrieved successfully."));
        }
        catch (Exception ex)
        {
            // [BƯỚC 5]: Xử lý lỗi ngoài ý muốn -> Trả về HTTP 500
            _logger.LogError(ex, "Error getting submission for Script ID {ScriptId}", scriptId);
            Console.WriteLine($"[GetLatestSubmissionByScript Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Failed to retrieve speaking submission."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/my-submissions
    /// Lấy toàn bộ danh sách các bài nộp luyện nói của học viên hiện tại qua các khóa học.
    /// </summary>
    /// <returns>ApiResponse chứa danh sách IEnumerable&lt;SpeakingSubmissionResponseDto&gt;.</returns>
    [HttpGet("my-submissions")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>>> GetMySubmissions()
    {
        // [BƯỚC 1]: Kiểm tra danh tính học viên từ Token
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Unauthorized."));
        }

        try
        {
            // [BƯỚC 2]: Truy vấn toàn bộ lịch sử bài nộp của học viên
            var submissions = await _submissionService.GetMySubmissionsAsync(learnerId.Value);

            // [BƯỚC 3]: Trả về HTTP 200 OK kèm danh sách bài nộp
            return Ok(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.SuccessResponse(submissions, "Submissions retrieved successfully."));
        }
        catch (Exception ex)
        {
            // [BƯỚC 4]: Xử lý lỗi hệ thống -> Trả về HTTP 500
            _logger.LogError(ex, "Error getting submissions for Learner ID {LearnerId}", learnerId);
            Console.WriteLine($"[GetMySubmissions Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Failed to retrieve your speaking submissions."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/instructor
    /// Giảng viên lấy danh sách bài nộp của học viên thuộc toàn bộ các khóa học do mình giảng dạy để chấm bài.
    /// Yêu cầu vai trò: Giảng viên hoặc Quản trị viên.
    /// </summary>
    /// <returns>ApiResponse chứa danh sách bài nộp của học viên gửi tới giảng viên.</returns>
    [HttpGet("instructor")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>>> GetInstructorSubmissions()
    {
        // [BƯỚC 1]: Kiểm tra xác thực ID của Giảng viên từ Claims
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
        {
            return Unauthorized(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Unauthorized."));
        }

        try
        {
            // [BƯỚC 2]: Truy vấn danh sách bài nộp thuộc các khóa học mà giảng viên này phụ trách
            var submissions = await _submissionService.GetSubmissionsForInstructorAsync(instructorId.Value);

            // [BƯỚC 3]: Trả về HTTP 200 OK kèm danh sách bài nộp
            return Ok(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.SuccessResponse(submissions, "Submissions for instructor retrieved successfully."));
        }
        catch (Exception ex)
        {
            // [BƯỚC 4]: Xử lý lỗi hệ thống -> Trả về HTTP 500
            _logger.LogError(ex, "Error getting instructor submissions for User ID {InstructorId}", instructorId);
            Console.WriteLine($"[GetInstructorSubmissions Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Failed to retrieve submissions for grading."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/course/{courseId}
    /// Giảng viên lấy danh sách bài nộp thuộc một khóa học cụ thể.
    /// Yêu cầu vai trò: Giảng viên hoặc Quản trị viên.
    /// </summary>
    /// <param name="courseId">ID khóa học cần lọc danh sách bài nộp.</param>
    /// <returns>ApiResponse chứa danh sách bài nộp theo khóa học.</returns>
    [HttpGet("course/{courseId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>>> GetCourseSubmissions(int courseId)
    {
        // [BƯỚC 1]: Xác thực danh tính Giảng viên
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
        {
            return Unauthorized(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Unauthorized."));
        }

        try
        {
            // [BƯỚC 2]: Lấy danh sách bài nộp của khóa học cho giảng viên
            var submissions = await _submissionService.GetSubmissionsByCourseForInstructorAsync(instructorId.Value, courseId);

            // [BƯỚC 3]: Trả về HTTP 200 OK kèm kết quả
            return Ok(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.SuccessResponse(submissions, "Submissions for course retrieved successfully."));
        }
        catch (Exception ex)
        {
            // [BƯỚC 4]: Xử lý lỗi hệ thống -> Trả về HTTP 500
            _logger.LogError(ex, "Error getting course submissions for Course ID {CourseId}", courseId);
            Console.WriteLine($"[GetCourseSubmissions Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Failed to retrieve submissions for course."));
        }
    }

    /// <summary>
    /// PUT /api/speaking-submissions/{submissionId}/grade
    /// Giảng viên chấm điểm và viết nhận xét chi tiết cho bài nộp Speaking của học viên.
    /// Yêu cầu vai trò: Giảng viên hoặc Quản trị viên.
    /// </summary>
    /// <param name="submissionId">ID bài nộp cần chấm điểm.</param>
    /// <param name="request">Payload chứa Điểm số (Score 0-100) và Nhận xét đánh giá chi tiết (Feedback).</param>
    /// <returns>ApiResponse chứa bài nộp sau khi chấm điểm SpeakingSubmissionResponseDto.</returns>
    [HttpPut("{submissionId:int}/grade")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> GradeSubmission(
        int submissionId, [FromBody] GradeSpeakingSubmissionRequest request)
    {
        // [BƯỚC 1]: Xác thực ID của Giảng viên từ Claims
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
        {
            return Unauthorized(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            // [BƯỚC 2]: Gọi Service thực hiện chấm điểm và đồng bộ LessonProgress
            // - Logic nội bộ Service: Kiểm tra quyền sở hữu khóa học của giảng viên, cập nhật Score, Feedback,
            //   GradedAt, GradedById, tính toán trạng thái Passed (>= 80) hoặc Failed (< 80) và cập nhật tiến độ bài học.
            var gradedSubmission = await _submissionService.GradeSubmissionAsync(instructorId.Value, submissionId, request);

            // [BƯỚC 3]: Rẽ nhánh kiểm tra sự tồn tại của bài nộp
            if (gradedSubmission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Submission not found."));
            }

            // [BƯỚC 4]: Phản hồi kết quả thành công HTTP 200 OK
            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(gradedSubmission, "Submission graded successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Unauthorized grade attempt: {Message}", ex.Message);
            Console.WriteLine($"[GradeSubmission Unauthorized] {ex.Message}");
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error grading submission ID {SubmissionId}", submissionId);
            Console.WriteLine($"[GradeSubmission Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Failed to grade submission."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/{submissionId}
    /// Lấy thông tin chi tiết một lượt nộp bài nói theo ID bài nộp (dành cho học viên nộp bài hoặc giảng viên/admin).
    /// </summary>
    [HttpGet("{submissionId:int}")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> GetSubmissionById(int submissionId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            var isInstructorOrAdmin = User.IsInRole("Instructor") || User.IsInRole("Admin");
            var submission = await _submissionService.GetSubmissionByIdAsync(submissionId, userId.Value, isInstructorOrAdmin);

            if (submission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Không tìm thấy bài nộp nói này."));
            }

            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(submission, "Chi tiết bài nộp được tải thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting submission by ID {SubmissionId}", submissionId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Có lỗi xảy ra khi tải chi tiết bài nộp."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/script/{scriptId}/history
    /// Lấy toàn bộ lịch sử các lần nộp bài của học viên hiện tại đối với một kịch bản nói.
    /// </summary>
    [HttpGet("script/{scriptId:int}/history")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingSubmissionHistoryDto>>>> GetSubmissionHistoryByScript(int scriptId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<IEnumerable<SpeakingSubmissionHistoryDto>>.FailureResponse("Unauthorized."));
        }

        try
        {
            var history = await _submissionService.GetSubmissionHistoryByScriptAsync(learnerId.Value, scriptId);
            return Ok(ApiResponse<IEnumerable<SpeakingSubmissionHistoryDto>>.SuccessResponse(history, "Lịch sử nộp bài được tải thành công."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting submission history for Script ID {ScriptId}", scriptId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingSubmissionHistoryDto>>.FailureResponse("Có lỗi xảy ra khi tải lịch sử nộp bài."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/lesson/{lessonId}/history
    /// Lấy toàn bộ lịch sử các lần nộp bài của học viên hiện tại đối với một bài học.
    /// </summary>
    [HttpGet("lesson/{lessonId:int}/history")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingSubmissionHistoryDto>>>> GetSubmissionHistoryByLesson(int lessonId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<IEnumerable<SpeakingSubmissionHistoryDto>>.FailureResponse("Unauthorized."));
        }

        try
        {
            var history = await _submissionService.GetSubmissionHistoryByLessonAsync(learnerId.Value, lessonId);
            return Ok(ApiResponse<IEnumerable<SpeakingSubmissionHistoryDto>>.SuccessResponse(history, "Lịch sử nộp bài được tải thành công."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting submission history for Lesson ID {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingSubmissionHistoryDto>>.FailureResponse("Có lỗi xảy ra khi tải lịch sử nộp bài."));
        }
    }
}
