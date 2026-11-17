// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Learning/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API (cung cấp các helper methods như Ok, BadRequest, NotFound, User, ModelState).
// - Định tuyến: [Route("api/speaking-submissions")].
// - Trang trí: [Authorize] (Yêu cầu xác thực JWT toàn bộ Controller), kết hợp [Authorize(Roles = "Instructor,Admin")] tại các API chấm bài.
// - Vai trò: Tiếp nhận các yêu cầu Nộp bài tập nói thực hành từ học viên (upload file multipart .mp3, .wav),
//   tra cứu bài nộp gần nhất theo Lesson/Script, và cung cấp bàn làm việc chấm điểm (Grading Workspace)
//   dành riêng cho Giảng viên / Admin.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Quản lý toàn bộ vòng đời (Lifecycle) của bài tập luyện nói thực hành trong hệ thống MSEEK:
//   1. Tiếp nhận file ghi âm giọng đọc/dẫn chương trình của học viên gửi lên máy chủ dưới dạng Multipart Form-Data.
//   2. Kiểm tra điều kiện nộp bài (Enrollment active, chống spam nộp lại khi bài trước đang chờ chấm Pending,
//      hoặc đã đạt chuẩn đầu ra Passed >= 80 điểm).
//   3. Trả về lịch sử nộp bài của cá nhân học viên để tự đánh giá sự tiến bộ qua các lần ghi âm.
//   4. Phục vụ Giảng viên: Lấy danh sách bài nộp cần chấm của các khóa mình phụ trách, nghe audio và cho điểm/nhận xét.
//   5. Đồng bộ điểm số sang tiến độ bài học (LessonProgress) và kích hoạt mở khóa bài học tiếp theo.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client (React Web / Mobile App) -> Gửi Multipart/form-data (File audio) hoặc JSON tới SpeakingSubmissionsController.
// - Controller -> Trích xuất LearnerId hoặc InstructorId từ JWT Claims -> Điều hướng tới ISpeakingSubmissionService.
// - ISpeakingSubmissionService -> Đẩy audio lên Cloudinary CDN, lưu thực thể SpeakingSubmission vào CSDL và đồng bộ LessonProgress.
// - Controller bọc kết quả trong ApiResponse<SpeakingSubmissionResponseDto> -> Trả về Client với HTTP Status Code phù hợp.
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
/// <remarks>
/// [Giải phẫu Class & Attributes]:
/// - [ApiController]: Kích hoạt các tính năng tự động của Web API trong ASP.NET Core:
///   + Tự động kiểm tra tính hợp lệ của Model (ModelState.IsValid) và trả về HTTP 400 nếu vi phạm ràng buộc DataAnnotations.
///   + Tự động suy diễn nguồn dữ liệu (Binding Source Inference) cho tham số hàm ([FromBody], [FromRoute], [FromQuery], [FromForm]).
///   + Định dạng phản hồi lỗi chuẩn hóa (ProblemDetails RFC 7807).
/// - [Route("api/speaking-submissions")]: Định nghĩa tiền tố đường dẫn URL cho toàn bộ endpoint trong controller.
/// - [Authorize]: Middleware yêu cầu xác thực JWT Bearer Token đối với tất cả các endpoint trong Controller này.
///   Nếu request không có token hoặc token hết hạn, framework tự ngắt và trả về HTTP 401 Unauthorized ngay trước khi vào controller.
/// - ControllerBase: Lớp cơ sở chuẩn của ASP.NET Core cho Web API (không bao gồm hỗ trợ MVC View engine để tiết kiệm bộ nhớ).
/// </remarks>
[ApiController]
[Route("api/speaking-submissions")]
[Authorize]
public class SpeakingSubmissionsController : ControllerBase
{
    // [Giải phẫu Dependency Fields]:
    // - private readonly: Chỉ cho phép gán giá trị 1 lần duy nhất trong Constructor, đảm bảo tính bất biến (Immutability).
    // - ISpeakingSubmissionService: Interface trừu tượng hóa nghiệp vụ nộp bài, upload audio và chấm điểm (Dependency Inversion Principle).
    // - ILogger<SpeakingSubmissionsController>: Dịch vụ ghi log có cấu trúc (Structured Logging) phục vụ giám sát và gỡ lỗi.
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
        // [Dòng này làm gì]: Gán các thể hiện Service và Logger được DI Container khởi tạo vào biến nội bộ.
        _submissionService = submissionService;
        _logger = logger;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Hàm tiện ích (Private Helper) trích xuất ID người dùng đang đăng nhập từ JWT Token Claims.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Đọc Claim NameIdentifier từ HttpContext.User (do JwtBearer middleware phân giải từ token).</para>
    /// <para>Bước 2: Dùng int.TryParse chuyển đổi chuỗi Claim thành số nguyên.</para>
    /// <para>Bước 3: Trả về UserId nếu parse thành công, hoặc null nếu không tìm thấy hoặc sai định dạng.</para>
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu token không hợp lệ.</returns>
    private int? GetCurrentUserId()
    {
        // [Dòng này làm gì]: Truy xuất chuỗi giá trị của Claim loại NameIdentifier từ ClaimsPrincipal của người dùng hiện tại.
        // [Giải phẫu từng từ khóa & toán tử]:
        // - User: Thuộc tính của ControllerBase đại diện cho HttpContext.User (ClaimsPrincipal).
        // - .FindFirst(ClaimTypes.NameIdentifier): Quét danh sách Claims tìm Claim đầu tiên có định danh là User Id chuẩn.
        // - ?.: Null-conditional operator; nếu FindFirst trả về null (không có claim này), biểu thức dừng lại và trả về null, tránh NullReferenceException.
        // - .Value: Lấy giá trị chuỗi lưu trữ trong Claim.
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        // [Dòng này làm gì]: Chuyển đổi chuỗi Id sang số nguyên an toàn và trả về kết quả.
        // [Giải phẫu từng từ khóa]:
        // - int.TryParse(claim, out var id): Cố gắng phân giải chuỗi `claim` thành số nguyên `id`. Trả về true nếu thành công, false nếu null hoặc chứa chữ.
        // - Toán tử 3 ngôi (? :): Nếu true trả về `id` (int?), nếu false trả về `null`.
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// POST /api/speaking-submissions
    /// Học viên nộp bài tập nói dưới dạng file âm thanh ghi âm (.mp3, .wav) kèm ghi chú.
    /// Xử lý định dạng Multipart Form-Data.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất learnerId từ JWT Claims -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 2: Kiểm tra ModelState.IsValid -> Trả về 400 Bad Request nếu thiếu file hoặc sai ràng buộc.</para>
    /// <para>Bước 3: Gọi _submissionService.SubmitSpeakingAssignmentAsync(learnerId, request) để upload Cloudinary và lưu DB.</para>
    /// <para>Bước 4: Trả về HTTP 200 OK bọc trong ApiResponse kèm SpeakingSubmissionResponseDto.</para>
    /// <para>Bước 5: Bắt ArgumentException (sai định dạng file, thiếu file) -> Trả về HTTP 400 Bad Request.</para>
    /// <para>Bước 6: Bắt KeyNotFoundException (không thấy bài học hoặc kịch bản nói) -> Trả về HTTP 404 Not Found.</para>
    /// <para>Bước 7: Bắt InvalidOperationException (chưa ghi danh, bài trước đang chờ chấm hoặc đã đạt >= 80) -> Trả về HTTP 400 Bad Request.</para>
    /// <para>Bước 8: Bắt ngoại lệ ngoài ý muốn -> Ghi log lỗi và trả về HTTP 500 Internal Server Error.</para>
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

        // [Giải phẫu rẽ nhánh if (learnerId == null)]:
        // - Điều kiện kiểm tra: learnerId có giá trị null hay không (Token không chứa Claim hợp lệ).
        // - TH TRUE: Người dùng chưa đăng nhập hoặc token bị lỗi -> Ghi log cảnh báo và trả về HTTP 401 Unauthorized ngay lập tức.
        // - TH FALSE: Đã xác định được danh tính học viên hợp lệ -> Tiếp tục luồng xử lý xuống khối try-catch.
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
            // [Giải phẫu điều kiện !ModelState.IsValid]:
            // - Điều kiện: ModelState.IsValid bằng false khi dữ liệu form gửi lên vi phạm DataAnnotations (ví dụ: thiếu file âm thanh [Required]).
            // - TH TRUE: Thu thập toàn bộ danh sách thông báo lỗi từ ModelState, ghi log và trả về HTTP 400 Bad Request kèm danh sách lỗi.
            // - TH FALSE: Dữ liệu hợp lệ -> Đi tiếp xuống [BƯỚC 3].
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
            // - Kết quả trả về: Thể hiện SpeakingSubmissionResponseDto chứa đường dẫn Cloudinary AudioUrl, AudioDuration, Status (Pending), v.v.
            var result = await _submissionService.SubmitSpeakingAssignmentAsync(learnerId.Value, request);

            // [BƯỚC 4]: Phản hồi kết quả thành công HTTP 200 OK
            // - Gói dữ liệu trong ApiResponse<T>.SuccessResponse kèm thông điệp thông báo nộp bài thành công.
            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(result, "Speaking assignment submitted successfully."));
        }
        catch (ArgumentException ex)
        {
            // [BẮT LỖI]: Bắt lỗi đối số không hợp lệ (file rỗng, định dạng không phải .mp3/.wav, kích thước vượt quá giới hạn) -> HTTP 400
            _logger.LogWarning("Bad Request in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Bad Request] {ex.Message}");
            return BadRequest(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            // [BẮT LỖI]: Bắt lỗi không tìm thấy bài học hoặc kịch bản luyện nói trong hệ thống -> HTTP 404
            _logger.LogWarning("Not Found in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Not Found] {ex.Message}");
            return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            // [BẮT LỖI]: Bắt lỗi vi phạm quy chế học tập (chưa ghi danh khóa học, bài nộp trước đang chờ giảng viên chấm, hoặc đã đạt >= 80 điểm) -> HTTP 400
            _logger.LogWarning("Conflict/Invalid Operation in SubmitSpeakingAssignment: {Message}", ex.Message);
            Console.WriteLine($"[SubmitSpeakingAssignment Invalid Operation] {ex.Message}");
            return BadRequest(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            // [BẮT LỖI]: Bắt lỗi ngoại lệ không kiểm soát (lỗi upload Cloudinary, rớt mạng CSDL) -> HTTP 500
            _logger.LogError(ex, "Internal Error in SubmitSpeakingAssignment for Learner ID {LearnerId}", learnerId);
            Console.WriteLine($"[SubmitSpeakingAssignment Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("An error occurred while processing your speaking submission."));
        }
    }

    /// <summary>
    /// GET /api/speaking-submissions/lesson/{lessonId}
    /// Lấy bài nộp mới nhất của học viên hiện tại đối với một bài học cụ thể.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất learnerId từ JWT Claims -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 2: Gọi _submissionService.GetLatestSubmissionByLessonAsync(learnerId, lessonId).</para>
    /// <para>Bước 3: Rẽ nhánh kiểm tra: Nếu submission == null -> Trả về 404 Not Found.</para>
    /// <para>Bước 4: Trả về HTTP 200 OK kèm dữ liệu bài nộp trong ApiResponse.</para>
    /// <para>Bước 5: Bắt ngoại lệ ngoài ý muốn và trả về HTTP 500 Internal Server Error.</para>
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
            // - Điều kiện: submission == null (Học viên chưa từng nộp bài tập nói cho bài học này).
            // - TH TRUE: Trả về HTTP 404 Not Found kèm thông báo phù hợp.
            // - TH FALSE: Trả về HTTP 200 OK chứa thông tin bài nộp gần nhất (điểm số, nhận xét, file ghi âm).
            if (submission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("No submission found for this lesson."));
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
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất learnerId từ JWT Claims -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 2: Gọi _submissionService.GetLatestSubmissionByScriptAsync(learnerId, scriptId).</para>
    /// <para>Bước 3: Rẽ nhánh: Nếu chưa có bài nộp (null) -> Trả về 404 Not Found.</para>
    /// <para>Bước 4: Trả về HTTP 200 OK kèm thông tin bài nộp gần nhất.</para>
    /// <para>Bước 5: Bắt ngoại lệ và trả về HTTP 500 nếu gặp lỗi hệ thống.</para>
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
            // - TH TRUE: Không tìm thấy bài nộp nào cho kịch bản này -> Trả về HTTP 404 Not Found.
            // - TH FALSE: Trả về dữ liệu bài nộp với HTTP 200 OK.
            if (submission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("No submission found for this script."));
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
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất learnerId từ JWT Claims -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 2: Gọi _submissionService.GetMySubmissionsAsync(learnerId).</para>
    /// <para>Bước 3: Trả về HTTP 200 OK bọc danh sách bài nộp trong ApiResponse.</para>
    /// <para>Bước 4: Bắt ngoại lệ và trả về HTTP 500 nếu có lỗi ngoài ý muốn.</para>
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
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Kiểm tra vai trò [Authorize(Roles = "Instructor,Admin")] tự động bởi middleware.</para>
    /// <para>Bước 2: Trích xuất instructorId từ JWT Claims -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 3: Gọi _submissionService.GetSubmissionsForInstructorAsync(instructorId).</para>
    /// <para>Bước 4: Trả về HTTP 200 OK kèm danh sách bài nộp cần chấm.</para>
    /// <para>Bước 5: Bắt ngoại lệ và trả về HTTP 500 nếu gặp sự cố.</para>
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
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Kiểm tra quyền Role Instructor/Admin.</para>
    /// <para>Bước 2: Trích xuất instructorId từ Token -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 3: Gọi _submissionService.GetSubmissionsByCourseForInstructorAsync(instructorId, courseId).</para>
    /// <para>Bước 4: Trả về HTTP 200 OK kèm danh sách bài nộp của khóa học.</para>
    /// <para>Bước 5: Bắt ngoại lệ và trả về HTTP 500.</para>
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
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Kiểm tra quyền vai trò Instructor/Admin.</para>
    /// <para>Bước 2: Trích xuất instructorId từ JWT Token -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 3: Gọi _submissionService.GradeSubmissionAsync(instructorId, submissionId, request) để cập nhật điểm và đồng bộ LessonProgress.</para>
    /// <para>Bước 4: Rẽ nhánh: Nếu gradedSubmission == null -> Trả về 404 Not Found.</para>
    /// <para>Bước 5: Trả về HTTP 200 OK kèm dữ liệu bài nộp sau khi chấm.</para>
    /// <para>Bước 6: Bắt UnauthorizedAccessException (giảng viên không phụ trách khóa học này) -> Trả về 403 Forbidden.</para>
    /// <para>Bước 7: Bắt ngoại lệ ngoài ý muốn -> Trả về HTTP 500 Internal Server Error.</para>
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
            // - Điều kiện: gradedSubmission == null (Không tìm thấy bản ghi bài nộp tương ứng submissionId).
            // - TH TRUE: Trả về HTTP 404 Not Found.
            // - TH FALSE: Tiếp tục trả về HTTP 200 OK kèm bản ghi bài nộp đã chấm.
            if (gradedSubmission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Submission not found."));
            }

            // [BƯỚC 4]: Phản hồi kết quả thành công HTTP 200 OK
            return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(gradedSubmission, "Submission graded successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            // [BẮT LỖI]: Bắt lỗi giảng viên cố tình chấm bài của khóa học do người khác giảng dạy -> HTTP 403 Forbidden
            _logger.LogWarning("Unauthorized grade attempt: {Message}", ex.Message);
            Console.WriteLine($"[GradeSubmission Unauthorized] {ex.Message}");
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            // [BẮT LỖI]: Bắt lỗi sập máy chủ ngoài ý muốn -> HTTP 500
            _logger.LogError(ex, "Error grading submission ID {SubmissionId}", submissionId);
            Console.WriteLine($"[GradeSubmission Error] {ex.Message}\n{ex.StackTrace}");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Failed to grade submission."));
        }
    }
}
