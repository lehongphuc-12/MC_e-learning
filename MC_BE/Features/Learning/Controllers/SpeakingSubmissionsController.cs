// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Learning/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API.
// - Định tuyến: [Route("api/speaking-submissions")].
// - Trang trí: [Authorize] (Yêu cầu xác thực JWT toàn bộ Controller).
// - Vai trò: Tiếp nhận các yêu cầu Nộp bài tập nói thực hành từ học viên (upload file multipart .mp3, .wav),
//   tra cứu bài nộp gần nhất theo Lesson/Script, và cung cấp bàn làm việc chấm điểm (Grading Workspace)
//   dành riêng cho Giảng viên / Admin.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Quản lý quy trình nộp và chấm bài nói thực tế:
//   1. Tiếp nhận file ghi âm giọng đọc/dẫn chương trình của học viên gửi lên máy chủ.
//   2. Kiểm tra điều kiện nộp bài, ngăn chặn spam nộp khi đang chờ chấm hoặc đã đạt chuẩn đầu ra (>= 80).
//   3. Trả về lịch sử nộp bài của cá nhân học viên để tự đánh giá sự tiến bộ.
//   4. Phục vụ Giảng viên: Lấy danh sách bài nộp cần chấm của các khóa mình phụ trách, nghe audio và cho điểm/nhận xét.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client -> Gửi Multipart/form-data (File audio) hoặc JSON tới SpeakingSubmissionsController.
// - Controller -> Trích xuất LearnerId hoặc InstructorId từ JWT Claims -> Điều hướng tới ISpeakingSubmissionService.
// - ISpeakingSubmissionService -> Đẩy audio lên Cloudinary, lưu thực thể SpeakingSubmission vào CSDL và đồng bộ LessonProgress.
// - Controller bọc kết quả trong ApiResponse<SpeakingSubmissionResponseDto> -> Trả về Client.
// ====================================================================================================

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
    public SpeakingSubmissionsController(
        ISpeakingSubmissionService submissionService,
        ILogger<SpeakingSubmissionsController> logger)
    {
        _submissionService = submissionService;
        _logger = logger;
    }

    /// <summary>
    /// Hàm tiện ích (Private Helper) lấy ID người dùng từ Claims trong JWT Token đã giải mã.
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu token không hợp lệ.</returns>
    private int? GetCurrentUserId()
    {
        // [BƯỚC 1]: Đọc Claim NameIdentifier từ HttpContext.User
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// POST /api/speaking-submissions
    /// Học viên nộp bài tập nói dưới dạng file âm thanh ghi âm (.mp3, .wav) kèm ghi chú.
    /// Xử lý định dạng Multipart Form-Data.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất learnerId từ JWT Claims -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 2: Kiểm tra ModelState.IsValid -> Trả về 400 Bad Request nếu thiếu file.</para>
    /// <para>Bước 3: Gọi _submissionService.SubmitSpeakingAssignmentAsync(learnerId, request).</para>
    /// <para>Bước 4: Trả về HTTP 200 OK bọc trong ApiResponse kèm SpeakingSubmissionResponseDto.</para>
    /// <para>Bước 5: Bắt ArgumentException (sai định dạng, thiếu ID) -> Trả về 400.</para>
    /// <para>Bước 6: Bắt KeyNotFoundException (không thấy bài học/kịch bản) -> Trả về 404.</para>
    /// <para>Bước 7: Bắt InvalidOperationException (chưa ghi danh, bài đang chờ chấm hoặc đã đạt >= 80) -> Trả về 400.</para>
    /// <para>Bước 8: Bắt ngoại lệ ngoài ý muốn -> Trả về HTTP 500.</para>
    /// </summary>
    /// <param name="request">Multipart form chứa file âm thanh, lessonId, scriptId, note.</param>
    /// <returns>ApiResponse chứa thông tin bài nộp SpeakingSubmissionResponseDto.</returns>
    /// <summary>
    /// POST /api/speaking-submissions
    /// Learner submits a speaking assignment audio file (.mp3 or .wav)
    /// Handles multipart/form-data
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> SubmitSpeakingAssignment(
        [FromForm] CreateSpeakingSubmissionRequest request)
    {
        // [BƯỚC 1]: Kiểm tra xác thực người dùng
        var learnerId = GetCurrentUserId();
        // Rẽ nhánh: Nếu token không hợp lệ hoặc thiếu Claim
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
            // - Điều kiện: !ModelState.IsValid (Thiếu AudioFile hoặc file không hợp lệ).
            // - Xử lý: Trả về HTTP 400 Bad Request kèm danh sách lỗi chi tiết.
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
            var result = await _submissionService.SubmitSpeakingAssignmentAsync(learnerId.Value, request);
            // [BƯỚC 4]: Phản hồi kết quả thành công HTTP 200 OK
            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(result, "Speaking assignment submitted successfully."));
        }
        catch (ArgumentException ex)
        {
            // Bắt lỗi đối số không hợp lệ (file rỗng, sai định dạng) -> HTTP 400
            _logger.LogWarning("Bad Request in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Bad Request] {ex.Message}");
            return BadRequest(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            // Bắt lỗi không tìm thấy bài học hoặc kịch bản -> HTTP 404
            _logger.LogWarning("Not Found in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Not Found] {ex.Message}");
            return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            // Bắt lỗi vi phạm quy chế (chưa enroll, đang chờ chấm, hoặc đã đạt >= 80) -> HTTP 400
            _logger.LogWarning("Conflict/Invalid Operation in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Invalid Operation] {ex.Message}");
            return BadRequest(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            // Bắt lỗi sập máy chủ không mong muốn -> HTTP 500
            _logger.LogError(ex, "Internal Error in SubmitSpeakingAssignment for Learner ID {LearnerId}", learnerId);
            Console.WriteLine($"[SubmitSpeakingAssignment Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("An error occurred while processing your speaking submission."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/lesson/{lessonId}
    /// Lấy bài nộp mới nhất của học viên hiện tại đối với một bài học cụ thể.
    /// <para>End-to-End Flow: Kiểm tra Token -> Gọi Service GetLatestSubmissionByLessonAsync -> Nếu null trả về 404 -> Trả về 200 OK.</para>
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>ApiResponse chứa SpeakingSubmissionResponseDto.</returns>
    /// <summary>
    /// GET /api/speaking-submissions/lesson/{lessonId}
    /// Get the latest speaking submission of current learner for a specific lesson
    /// </summary>
    [HttpGet("lesson/{lessonId:int}")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> GetLatestSubmissionByLesson(int lessonId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            var submission = await _submissionService.GetLatestSubmissionByLessonAsync(learnerId.Value, lessonId);
            // Rẽ nhánh: Học viên chưa từng nộp bài cho bài học này
            if (submission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("No submission found for this lesson."));
            }

            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(submission, "Submission retrieved successfully."));
        }
        catch (Exception ex)
        {
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
    /// <param name="scriptId">ID kịch bản.</param>
    /// <returns>ApiResponse chứa SpeakingSubmissionResponseDto.</returns>
    /// <summary>
    /// GET /api/speaking-submissions/script/{scriptId}
    /// Get the latest speaking submission of current learner for a specific speaking script
    /// </summary>
    [HttpGet("script/{scriptId:int}")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> GetLatestSubmissionByScript(int scriptId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            var submission = await _submissionService.GetLatestSubmissionByScriptAsync(learnerId.Value, scriptId);
            // Rẽ nhánh: Chưa có bài nộp nào
            if (submission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("No submission found for this script."));
            }

            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(submission, "Submission retrieved successfully."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting submission for Script ID {ScriptId}", scriptId);
            Console.WriteLine($"[GetLatestSubmissionByScript Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Failed to retrieve speaking submission."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/my-submissions
    /// Lấy toàn bộ danh sách các bài nộp luyện nói của học viên hiện tại.
    /// </summary>
    /// <summary>
    /// GET /api/speaking-submissions/my-submissions
    /// Get all speaking submissions submitted by current learner
    /// </summary>
    [HttpGet("my-submissions")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>>> GetMySubmissions()
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Unauthorized."));
        }

        try
        {
            var submissions = await _submissionService.GetMySubmissionsAsync(learnerId.Value);
            return Ok(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.SuccessResponse(submissions, "Submissions retrieved successfully."));
        }
        catch (Exception ex)
        {
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
    /// <summary>
    /// GET /api/speaking-submissions/instructor
    /// Instructor retrieves speaking submissions across their courses for grading
    /// </summary>
    [HttpGet("instructor")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>>> GetInstructorSubmissions()
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
        {
            return Unauthorized(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Unauthorized."));
        }

        try
        {
            var submissions = await _submissionService.GetSubmissionsForInstructorAsync(instructorId.Value);
            return Ok(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.SuccessResponse(submissions, "Submissions for instructor retrieved successfully."));
        }
        catch (Exception ex)
        {
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
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>ApiResponse chứa danh sách bài nộp.</returns>
    /// <summary>
    /// GET /api/speaking-submissions/course/{courseId}
    /// Instructor retrieves speaking submissions for a specific course
    /// </summary>
    [HttpGet("course/{courseId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>>> GetCourseSubmissions(int courseId)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
        {
            return Unauthorized(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Unauthorized."));
        }

        try
        {
            var submissions = await _submissionService.GetSubmissionsByCourseForInstructorAsync(instructorId.Value, courseId);
            return Ok(ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.SuccessResponse(submissions, "Submissions for course retrieved successfully."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting course submissions for Course ID {CourseId}", courseId);
            Console.WriteLine($"[GetCourseSubmissions Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingSubmissionResponseDto>>.FailureResponse("Failed to retrieve submissions for course."));
        }
    }

    /// <summary>
    /// PUT /api/speaking-submissions/{submissionId}/grade
    /// Giảng viên chấm điểm và viết nhận xét chi tiết cho bài nộp Speaking.
    /// Yêu cầu vai trò: Giảng viên hoặc Quản trị viên.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất instructorId từ JWT Token.</para>
    /// <para>Bước 2: Gọi _submissionService.GradeSubmissionAsync(instructorId, submissionId, request).</para>
    /// <para>Bước 3: Nếu bài nộp không tồn tại -> Trả về 404 Not Found.</para>
    /// <para>Bước 4: Trả về HTTP 200 OK bọc trong ApiResponse kèm SpeakingSubmissionResponseDto đã chấm.</para>
    /// <para>Bước 5: Bắt UnauthorizedAccessException (giảng viên không phụ trách khóa này) -> Trả về 403 Forbidden.</para>
    /// </summary>
    /// <param name="submissionId">ID bài nộp cần chấm.</param>
    /// <param name="request">Điểm số và nhận xét.</param>
    /// <returns>ApiResponse chứa bài nộp sau khi chấm điểm.</returns>
    /// <summary>
    /// PUT /api/speaking-submissions/{submissionId}/grade
    /// Instructor grades a learner's speaking submission
    /// </summary>
    [HttpPut("{submissionId:int}/grade")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> GradeSubmission(
        int submissionId, [FromBody] GradeSpeakingSubmissionRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
        {
            return Unauthorized(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            // Gọi Service thực hiện chấm điểm và đồng bộ LessonProgress
            var gradedSubmission = await _submissionService.GradeSubmissionAsync(instructorId.Value, submissionId, request);
            // Rẽ nhánh: Nếu bài nộp không tồn tại trong CSDL
            if (gradedSubmission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Submission not found."));
            }

            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(gradedSubmission, "Submission graded successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            // Bắt lỗi giảng viên cố tình chấm bài của khóa học do người khác dạy -> HTTP 403
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
}
