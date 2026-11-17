// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Learning/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API.
// - Định tuyến: [Route("api/speaking-scripts")].
// - Trang trí: [Authorize] (Yêu cầu xác thực JWT).
// - Vai trò: Cung cấp toàn bộ các điểm cuối RESTful API phục vụ quản lý, bóc tách và xuất bản Kịch bản luyện nói
//   (Speaking Scripts) đa cấp độ (Beginner, Intermediate, Advanced) và đa phạm vi (Lesson, Chapter, Final).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Phục vụ Giảng viên và Quản trị viên:
//   1. Phân tích tài liệu kịch bản Word/Text trực tiếp (Parse Script Document In-Memory).
//   2. Lưu và xuất bản kịch bản 3 cấp độ (Publish Speaking Script).
//   3. Tạo mới, cập nhật, xóa kịch bản nói theo bài học hoặc độc lập (CRUD Speaking Scripts).
//   4. Chỉnh sửa riêng lẻ từng cấp độ kịch bản.
// - Phục vụ Học viên:
//   1. Xem danh sách kịch bản của khóa học.
//   2. Lấy nội dung chi tiết kịch bản theo từng cấp độ để bắt đầu thu âm luyện nói.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client -> Gửi Request kèm Bearer Token tới SpeakingScriptController.
// - Controller -> Kiểm tra quyền (Roles = "Instructor,Admin" đối với các thao tác ghi) -> Gọi ISpeakingScriptService.
// - Service -> Phối hợp với SpeakingScriptParserService và ISpeakingScriptRepository để xử lý nghiệp vụ.
// - Kết quả -> Chuẩn hóa qua ApiResponse<T> -> Trả về Client.
// ====================================================================================================

using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Controllers;

/// <summary>
/// API Controller quản lý các hoạt động biên soạn, phân tích tài liệu và xuất bản kịch bản luyện nói.
/// </summary>
[ApiController]
[Route("api/speaking-scripts")]
[Authorize]
public class SpeakingScriptController : ControllerBase
{
    private readonly ISpeakingScriptService _scriptService;
    private readonly ILogger<SpeakingScriptController> _logger;

    /// <summary>
    /// Khởi tạo Controller với các dependency được inject từ DI Container.
    /// </summary>
    public SpeakingScriptController(
        ISpeakingScriptService scriptService,
        ILogger<SpeakingScriptController> logger)
    {
        _scriptService = scriptService;
        _logger = logger;
    }

    /// <summary>
    /// Hàm tiện ích (Private Helper) trích xuất ID người dùng đang đăng nhập từ JWT Token Claims.
    /// </summary>
    /// <returns>UserId kiểu int hoặc null nếu token không hợp lệ.</returns>
    private int? GetCurrentUserId()
    {
        // [BƯỚC 1]: Đọc Claim NameIdentifier hoặc sub từ HttpContext.User
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/speaking-scripts
    /// Lọc và tìm kiếm danh sách kịch bản luyện nói theo nhiều tiêu chí (Khóa học, Phạm vi, Chương, Bài học, Từ khóa).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Nhận các Query Parameters (courseId, scope, moduleId, lessonId, search).</para>
    /// <para>Bước 2: Gọi _scriptService.GetAllScriptsAsync(...) để truy vấn CSDL.</para>
    /// <para>Bước 3: Trả về HTTP 200 OK bọc trong ApiResponse.</para>
    /// <para>Bước 4: Bắt ngoại lệ và trả về HTTP 500 nếu có lỗi ngoài ý muốn.</para>
    /// </summary>
    /// <returns>Danh sách SpeakingScriptDto thỏa mãn bộ lọc.</returns>
    /// <summary>
    /// GET /api/speaking-scripts
    /// Filter speaking scripts by course, scope, module, lesson, and search keyword
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingScriptDto>>>> GetScripts(
        [FromQuery] int? courseId,
        [FromQuery] SpeakingScope? scope,
        [FromQuery] int? moduleId,
        [FromQuery] int? lessonId,
        [FromQuery] string? search)
    {
        try
        {
            // [BƯỚC 1]: Gọi Service thực thi truy vấn động
            var scripts = await _scriptService.GetAllScriptsAsync(courseId, scope, moduleId, lessonId, search);
            // [BƯỚC 2]: Phản hồi HTTP 200 OK
            return Ok(ApiResponse<IEnumerable<SpeakingScriptDto>>.SuccessResponse(scripts));
        }
        catch (Exception ex)
        {
            // [BƯỚC 3]: Bắt ngoại lệ không mong muốn
            _logger.LogError(ex, "Error getting speaking scripts");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingScriptDto>>.FailureResponse("Không thể tải danh sách kịch bản bài tập nói."));
        }
    }

    /// <summary>
    /// GET /api/speaking-scripts/{id:int}
    /// Lấy chi tiết một kịch bản luyện nói theo ScriptId (bao gồm cả 3 cấp độ nói).
    /// <para>End-to-End Flow: Nhận id từ Route -> Gọi _scriptService.GetScriptByIdAsync(id) -> Nếu null trả về 404 Not Found -> Trả về 200 OK.</para>
    /// </summary>
    /// <param name="id">ID kịch bản.</param>
    /// <returns>ApiResponse chứa SpeakingScriptDto.</returns>
    /// <summary>
    /// GET /api/speaking-scripts/{id:int}
    /// Get script details by ID
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptDto>>> GetScriptById(int id)
    {
        try
        {
            var script = await _scriptService.GetScriptByIdAsync(id);
            // Rẽ nhánh: Nếu kịch bản không tồn tại trong CSDL
            if (script == null)
            {
                return NotFound(ApiResponse<SpeakingScriptDto>.FailureResponse("Không tìm thấy kịch bản nói."));
            }

            return Ok(ApiResponse<SpeakingScriptDto>.SuccessResponse(script));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting speaking script {Id}", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Không thể tải chi tiết kịch bản nói."));
        }
    }

    /// <summary>
    /// GET /api/speaking-scripts/course/{courseId:int}
    /// Lấy toàn bộ danh sách kịch bản luyện nói thuộc một khóa học cụ thể.
    /// </summary>
    /// <param name="courseId">ID khóa học.</param>
    /// <returns>ApiResponse chứa danh sách SpeakingScriptDto.</returns>
    /// <summary>
    /// GET /api/speaking-scripts/course/{courseId:int}
    /// Get all speaking scripts of a course
    /// </summary>
    [HttpGet("course/{courseId:int}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingScriptDto>>>> GetScriptsByCourse(int courseId)
    {
        try
        {
            var scripts = await _scriptService.GetScriptsByCourseAsync(courseId);
            return Ok(ApiResponse<IEnumerable<SpeakingScriptDto>>.SuccessResponse(scripts));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting speaking scripts for Course {CourseId}", courseId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingScriptDto>>.FailureResponse("Không thể tải kịch bản nói của khóa học."));
        }
    }

    /// <summary>
    /// POST /api/speaking-scripts
    /// Tạo mới một kịch bản luyện nói kèm 3 cấp độ (hỗ trợ các phạm vi Bài học, Cuối chương hoặc Cuối khóa).
    /// Yêu cầu vai trò: Giảng viên hoặc Quản trị viên.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất instructorId từ Token -> Nếu null trả về 401 Unauthorized.</para>
    /// <para>Bước 2: Kiểm tra ModelState.IsValid -> Nếu vi phạm DataAnnotations trả về 400 Bad Request.</para>
    /// <para>Bước 3: Gọi _scriptService.CreateScriptAsync(request, instructorId).</para>
    /// <para>Bước 4: Trả về HTTP 200 OK kèm SpeakingScriptDto vừa tạo.</para>
    /// <para>Bước 5: Bắt UnauthorizedAccessException -> Trả về 403 Forbidden.</para>
    /// <para>Bước 6: Bắt KeyNotFoundException -> Trả về 404 Not Found.</para>
    /// </summary>
    /// <param name="request">Dữ liệu tạo mới kịch bản.</param>
    /// <returns>SpeakingScriptDto sau khi tạo thành công.</returns>
    /// <summary>
    /// POST /api/speaking-scripts
    /// Create new speaking script with 3 levels and scope (Lesson / Chapter / Final)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptDto>>> CreateScript([FromBody] CreateSpeakingScriptRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<SpeakingScriptDto>.FailureResponse("Unauthorized"));

        try
        {
            // Rẽ nhánh kiểm tra tính hợp lệ của Model
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<SpeakingScriptDto>.FailureResponse("Dữ liệu không hợp lệ.", errors));
            }

            var result = await _scriptService.CreateScriptAsync(request, instructorId.Value);
            return Ok(ApiResponse<SpeakingScriptDto>.SuccessResponse(result, "Tạo bài tập nói thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating speaking script");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Đã xảy ra lỗi khi tạo bài tập nói."));
        }
    }

    /// <summary>
    /// PUT /api/speaking-scripts/{id:int}
    /// Cập nhật thông tin và các cấp độ của một kịch bản luyện nói theo ScriptId.
    /// </summary>
    /// <summary>
    /// PUT /api/speaking-scripts/{id:int}
    /// Update speaking script
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptDto>>> UpdateScript(int id, [FromBody] UpdateSpeakingScriptRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<SpeakingScriptDto>.FailureResponse("Unauthorized"));

        try
        {
            var result = await _scriptService.UpdateScriptAsync(id, request, instructorId.Value);
            return Ok(ApiResponse<SpeakingScriptDto>.SuccessResponse(result, "Cập nhật bài tập nói thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating speaking script {Id}", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Đã xảy ra lỗi khi cập nhật bài tập nói."));
        }
    }

    /// <summary>
    /// DELETE /api/speaking-scripts/{id:int}
    /// Xóa một kịch bản luyện nói theo ID.
    /// </summary>
    /// <summary>
    /// DELETE /api/speaking-scripts/{id:int}
    /// Delete speaking script by ID
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteScriptById(int id)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized"));

        try
        {
            var success = await _scriptService.DeleteScriptByIdAsync(id, instructorId.Value);
            if (!success)
                return NotFound(ApiResponse<bool>.FailureResponse("Không tìm thấy kịch bản để xóa."));

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã xóa bài tập nói thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting speaking script {Id}", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<bool>.FailureResponse("Đã xảy ra lỗi khi xóa bài tập nói."));
        }
    }

    /// <summary>
    /// POST /api/speaking-scripts/parse-file
    /// Tiện ích bóc tách trực tiếp file kịch bản (.docx, .txt, .md) trên bộ nhớ RAM để xem trước.
    /// Không lưu vào CSDL, không yêu cầu LessonId.
    /// </summary>
    /// <summary>
    /// POST /api/speaking-scripts/parse-file
    /// Parse script document (.docx, .txt, .md) in-memory before lesson is created
    /// </summary>
    [HttpPost("parse-file")]
    [Authorize(Roles = "Instructor,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<ParsePreviewDto>>> ParseScriptFileDirect(
        [FromForm] ParseScriptFileRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<ParsePreviewDto>.FailureResponse("Unauthorized"));

        try
        {
            // Kiểm tra tính tồn tại của file
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(ApiResponse<ParsePreviewDto>.FailureResponse("Vui lòng tải lên tập tin kịch bản."));
            }

            var preview = await _scriptService.ParseFileDirectAsync(request.File);

            // Rẽ nhánh: Nếu Parser Engine phát hiện lỗi phân tích (file hỏng, sai cú pháp)
            if (!preview.Success)
            {
                return BadRequest(ApiResponse<ParsePreviewDto>.FailureResponse(
                    "Không thể phân tích tài liệu kịch bản.", preview.Errors));
            }

            return Ok(ApiResponse<ParsePreviewDto>.SuccessResponse(preview, "Phân tích kịch bản thành công."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing script file directly");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<ParsePreviewDto>.FailureResponse("Đã xảy ra lỗi khi phân tích tập tin kịch bản."));
        }
    }

    /// <summary>
    /// POST /api/speaking-scripts/lessons/{lessonId}/parse
    /// Bóc tách file tài liệu kịch bản gắn liền với một bài học cụ thể, có kiểm tra quyền sở hữu của giảng viên.
    /// </summary>
    /// <summary>
    /// POST /api/speaking-scripts/lessons/{lessonId}/parse
    /// Instructor uploads document (.docx, .txt, .md) to be parsed in-memory into 3 levels
    /// </summary>
    [HttpPost("lessons/{lessonId:int}/parse")]
    [Authorize(Roles = "Instructor,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<ParsePreviewDto>>> ParseScriptFile(
        int lessonId, [FromForm] ParseScriptFileRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<ParsePreviewDto>.FailureResponse("Unauthorized"));

        try
        {
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(ApiResponse<ParsePreviewDto>.FailureResponse("Vui lòng tải lên tập tin kịch bản."));
            }

            var preview = await _scriptService.ParseScriptFileAsync(lessonId, request.File, instructorId.Value);

            if (!preview.Success)
            {
                return BadRequest(ApiResponse<ParsePreviewDto>.FailureResponse(
                    "Không thể phân tích tài liệu kịch bản.", preview.Errors));
            }

            return Ok(ApiResponse<ParsePreviewDto>.SuccessResponse(preview, "Phân tích kịch bản thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<ParsePreviewDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<ParsePreviewDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing script file for Lesson {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<ParsePreviewDto>.FailureResponse("Đã xảy ra lỗi khi phân tích tập tin kịch bản."));
        }
    }

    /// <summary>
    /// POST /api/speaking-scripts/lessons/{lessonId}/publish
    /// Giảng viên lưu chính thức và xuất bản kịch bản 3 cấp độ cho một bài học.
    /// </summary>
    /// <summary>
    /// POST /api/speaking-scripts/lessons/{lessonId}/publish
    /// Instructor saves and publishes the 3-level script
    /// </summary>
    [HttpPost("lessons/{lessonId:int}/publish")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptDto>>> SaveAndPublishScript(
        int lessonId, [FromBody] SaveScriptRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<SpeakingScriptDto>.FailureResponse("Unauthorized"));

        try
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<SpeakingScriptDto>.FailureResponse("Dữ liệu không hợp lệ.", errors));
            }

            var result = await _scriptService.SaveAndPublishAsync(lessonId, request, instructorId.Value);
            return Ok(ApiResponse<SpeakingScriptDto>.SuccessResponse(result, "Lưu và xuất bản kịch bản thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving script for Lesson {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Đã xảy ra lỗi khi lưu kịch bản."));
        }
    }

    /// <summary>
    /// GET /api/speaking-scripts/lessons/{lessonId}
    /// Lấy toàn bộ thông tin kịch bản và 3 cấp độ của một bài học (Dành cho cả Giảng viên và Học viên).
    /// </summary>
    /// <summary>
    /// GET /api/speaking-scripts/lessons/{lessonId}
    /// Get speaking script with all 3 levels for a lesson (Students & Instructors)
    /// </summary>
    [HttpGet("lessons/{lessonId:int}")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptDto>>> GetScriptByLesson(int lessonId)
    {
        try
        {
            var script = await _scriptService.GetScriptByLessonAsync(lessonId);
            if (script == null)
            {
                return NotFound(ApiResponse<SpeakingScriptDto>.FailureResponse("Chưa có kịch bản cho bài tập nói này."));
            }

            return Ok(ApiResponse<SpeakingScriptDto>.SuccessResponse(script));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving script for Lesson {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Không thể tải kịch bản nói."));
        }
    }

    /// <summary>
    /// GET /api/speaking-scripts/lessons/{lessonId}/level/{level}
    /// Lấy nội dung chi tiết của một cấp độ luyện nói cụ thể phục vụ học viên bắt đầu thu âm.
    /// </summary>
    /// <summary>
    /// GET /api/speaking-scripts/lessons/{lessonId}/level/{level}
    /// Get specific level script content for student practice
    /// </summary>
    [HttpGet("lessons/{lessonId:int}/level/{level}")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptLevelDto>>> GetLevelContent(int lessonId, SpeakingLevel level)
    {
        try
        {
            var levelContent = await _scriptService.GetLevelContentAsync(lessonId, level);
            if (levelContent == null)
            {
                return NotFound(ApiResponse<SpeakingScriptLevelDto>.FailureResponse($"Không tìm thấy nội dung cấp độ {level}."));
            }

            return Ok(ApiResponse<SpeakingScriptLevelDto>.SuccessResponse(levelContent));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving level {Level} content for Lesson {LessonId}", level, lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptLevelDto>.FailureResponse("Không thể tải nội dung cấp độ kịch bản."));
        }
    }

    /// <summary>
    /// PUT /api/speaking-scripts/{scriptId}/levels/{level}
    /// Chỉnh sửa riêng lẻ nội dung hoặc kịch bản sạch của một cấp độ cụ thể.
    /// </summary>
    /// <summary>
    /// PUT /api/speaking-scripts/{scriptId}/levels/{level}
    /// Update content of a single level
    /// </summary>
    [HttpPut("{scriptId:int}/levels/{level}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptDto>>> UpdateLevelContent(
        int scriptId, SpeakingLevel level, [FromBody] UpdateLevelContentRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<SpeakingScriptDto>.FailureResponse("Unauthorized"));

        try
        {
            var result = await _scriptService.UpdateLevelContentAsync(scriptId, level, request, instructorId.Value);
            if (result == null)
                return NotFound(ApiResponse<SpeakingScriptDto>.FailureResponse("Không tìm thấy kịch bản."));

            return Ok(ApiResponse<SpeakingScriptDto>.SuccessResponse(result, "Cập nhật cấp độ kịch bản thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating level content for Script {ScriptId}", scriptId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Đã xảy ra lỗi khi cập nhật cấp độ kịch bản."));
        }
    }

    /// <summary>
    /// DELETE /api/speaking-scripts/lessons/{lessonId}
    /// Giảng viên xóa kịch bản luyện nói gắn liền với một bài học.
    /// </summary>
    /// <summary>
    /// DELETE /api/speaking-scripts/lessons/{lessonId}
    /// Instructor deletes a speaking script
    /// </summary>
    [HttpDelete("lessons/{lessonId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteScript(int lessonId)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized"));

        try
        {
            var success = await _scriptService.DeleteScriptAsync(lessonId, instructorId.Value);
            if (!success)
                return NotFound(ApiResponse<bool>.FailureResponse("Không tìm thấy kịch bản để xóa."));

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã xóa kịch bản nói thành công."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting script for Lesson {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<bool>.FailureResponse("Đã xảy ra lỗi khi xóa kịch bản nói."));
        }
    }
}
