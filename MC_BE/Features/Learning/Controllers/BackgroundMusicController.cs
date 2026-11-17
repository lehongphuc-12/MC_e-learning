// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Presentation Layer (API Controller / Entry Point).
// - Nằm trong module: Features/Learning/Controllers.
// - Kế thừa từ: ControllerBase trong ASP.NET Core Web API.
// - Trang trí các thuộc tính (Attributes): [ApiController], [Route("api/speaking-scripts")], [Authorize].
// - Vai trò: Tiếp nhận các HTTP Request từ Web/Mobile Client liên quan đến Nhạc nền luyện nói (Background Music),
//   giải mã danh tính người dùng từ JWT Token Claims, điều hướng tới IBackgroundMusicService và chuẩn hóa
//   kết quả trả về theo khuôn mẫu chuẩn ApiResponse<T>.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Cung cấp API cho Học viên: Nghe danh sách nhạc nền mặc định hoặc nhạc nền được thiết kế riêng cho bài học.
// - Cung cấp API cho Giảng viên / Admin:
//   1. Tải trước file nhạc lên CDN Cloudinary (Pre-upload) để nghe thử.
//   2. Liên kết hàng loạt nhạc đã upload vào bài học (Batch Link).
//   3. Tải lên trực tiếp và liên kết ngay vào bài học (Direct Upload).
//   4. Xóa nhạc nền riêng khỏi hệ thống và máy chủ lưu trữ.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Client -> Gửi HTTP Request (JSON hoặc Multipart/form-data) kèm Bearer JWT Token.
// - Controller -> Giải mã UserId qua GetCurrentUserId() -> Gọi IBackgroundMusicService.
// - Service -> Thao tác với CloudinaryService và SmartMcDbContext.
// - Kết quả -> Controller bọc trong ApiResponse<T> -> Trả về Client với HTTP Status Code chuẩn (200, 400, 401, 403, 404, 500).
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
/// API Controller quản lý các hoạt động liên quan đến Nhạc nền luyện tập Speaking.
/// </summary>
[ApiController]
[Route("api/speaking-scripts")]
[Authorize]
public class BackgroundMusicController : ControllerBase
{
    private readonly IBackgroundMusicService _musicService;
    private readonly ILogger<BackgroundMusicController> _logger;

    /// <summary>
    /// Khởi tạo Controller với các dependency được inject từ DI Container.
    /// </summary>
    public BackgroundMusicController(
        IBackgroundMusicService musicService,
        ILogger<BackgroundMusicController> logger)
    {
        _musicService = musicService;
        _logger = logger;
    }

    /// <summary>
    /// Hàm tiện ích (Private Helper) trích xuất ID người dùng đang đăng nhập từ JWT Token Claims.
    /// <para>End-to-End Flow: Kiểm tra ClaimTypes.NameIdentifier -> Nếu null kiểm tra claim 'sub' -> Chuyển đổi sang số nguyên (int).</para>
    /// </summary>
    /// <returns>UserId kiểu int nếu hợp lệ; ngược lại trả về null.</returns>
    private int? GetCurrentUserId()
    {
        // [BƯỚC 1]: Đọc giá trị Claim NameIdentifier hoặc Subject (sub) từ HttpContext.User
        // [TẠI SAO DÙNG KỸ THUẬT NÀY - BẢO MẬT CHỐNG GIẢ MẠO]:
        //   - Tuyệt đối không nhận UserId từ Body hoặc Query String vì client có thể can thiệp sửa đổi (IDOR Attack).
        //   - UserId được lấy trực tiếp từ JWT Payload đã được xác thực chữ ký điện tử (HMAC-SHA256) ở Middleware Authentication.
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/speaking-scripts/musics/defaults
    /// Lấy danh sách các bài nhạc nền mặc định toàn hệ thống.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Gọi _musicService.GetDefaultMusicsAsync().</para>
    /// <para>Bước 2: Trả về HTTP 200 OK bọc trong ApiResponse SuccessResponse.</para>
    /// <para>Bước 3: Nếu phát sinh lỗi ngoài ý muốn -> Bắt ngoại lệ, ghi log Error và trả về HTTP 500.</para>
    /// </summary>
    /// <returns>Danh sách BackgroundMusicDto mặc định.</returns>
    /// <summary>
    /// GET /api/speaking-scripts/musics/defaults
    /// Lấy danh sách 4 bài nhạc nền hệ thống mặc định
    /// </summary>
    [HttpGet("musics/defaults")]
    public async Task<ActionResult<ApiResponse<List<BackgroundMusicDto>>>> GetDefaultMusics()
    {
        try
        {
            // [BƯỚC 1]: Gọi tầng Service lấy danh sách nhạc mặc định
            var musics = await _musicService.GetDefaultMusicsAsync();
            // [BƯỚC 2]: Trả về kết quả HTTP 200 OK
            return Ok(ApiResponse<List<BackgroundMusicDto>>.SuccessResponse(musics));
        }
        catch (Exception ex)
        {
            // [BƯỚC 3]: Xử lý ngoại lệ máy chủ (Internal Server Error)
            _logger.LogError(ex, "Lỗi khi lấy danh sách nhạc nền mặc định");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<List<BackgroundMusicDto>>.FailureResponse("Không thể tải danh sách nhạc nền mặc định."));
        }
    }

    /// <summary>
    /// GET /api/speaking-scripts/lessons/{lessonId}/musics
    /// Lấy danh sách nhạc khả dụng cho một bài học (bao gồm nhạc hệ thống và nhạc riêng của bài học).
    /// <para>End-to-End Flow: Nhận lessonId từ Route -> Gọi _musicService.GetMusicsForLessonAsync -> Trả về HTTP 200 OK.</para>
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <returns>Danh sách BackgroundMusicDto khả dụng.</returns>
    /// <summary>
    /// GET /api/speaking-scripts/lessons/{lessonId}/musics
    /// Lấy danh sách nhạc khả dụng cho bài học (nhạc hệ thống + nhạc giảng viên upload)
    /// </summary>
    [HttpGet("lessons/{lessonId:int}/musics")]
    public async Task<ActionResult<ApiResponse<List<BackgroundMusicDto>>>> GetMusicsForLesson(int lessonId)
    {
        try
        {
            // [BƯỚC 1]: Gọi Service lấy nhạc nền kết hợp
            var musics = await _musicService.GetMusicsForLessonAsync(lessonId);
            return Ok(ApiResponse<List<BackgroundMusicDto>>.SuccessResponse(musics));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách nhạc cho bài học {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<List<BackgroundMusicDto>>.FailureResponse("Không thể tải danh sách nhạc nền của bài học."));
        }
    }

    /// <summary>
    /// POST /api/speaking-scripts/musics/pre-upload
    /// Tải trước file âm thanh lên Cloudinary khi giảng viên chọn file trong modal soạn bài.
    /// Yêu cầu vai trò: Giảng viên (Instructor) hoặc Quản trị viên (Admin).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Trích xuất instructorId từ JWT -> Nếu null trả về HTTP 401 Unauthorized.</para>
    /// <para>Bước 2: Kiểm tra file rỗng -> Trả về HTTP 400 BadRequest nếu vi phạm.</para>
    /// <para>Bước 3: Gọi _musicService.PreUploadMusicAsync tải file lên Cloudinary.</para>
    /// <para>Bước 4: Trả về HTTP 200 OK kèm URL nghe thử và PublicId.</para>
    /// <para>Bước 5: Bắt ArgumentException (lỗi định dạng/kích thước) -> Trả về HTTP 400.</para>
    /// </summary>
    /// <param name="request">Multipart form data chứa file và tiêu đề.</param>
    /// <returns>PreUploadMusicResultDto.</returns>
    /// <summary>
    /// POST /api/speaking-scripts/musics/pre-upload
    /// Upload trước file nhạc lên Cloudinary khi giảng viên chọn file trong modal
    /// </summary>
    [HttpPost("musics/pre-upload")]
    [Authorize(Roles = "Instructor,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<PreUploadMusicResultDto>>> PreUploadMusic(
        [FromForm] UploadBackgroundMusicRequest request)
    {
        // [BƯỚC 1]: Kiểm tra danh tính người dùng đang gọi API
        var instructorId = GetCurrentUserId();
        // Rẽ nhánh: Nếu token không hợp lệ hoặc thiếu claim -> Trả về HTTP 401
        if (instructorId == null)
            return Unauthorized(ApiResponse<PreUploadMusicResultDto>.FailureResponse("Unauthorized"));

        try
        {
            // [BƯỚC 2]: Rẽ nhánh kiểm tra sự hiện diện của file
            // - Điều kiện: request.File == null || request.File.Length == 0.
            // - Xử lý: Trả về HTTP 400 BadRequest ("Vui lòng tải lên tập tin âm thanh.").
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(ApiResponse<PreUploadMusicResultDto>.FailureResponse("Vui lòng tải lên tập tin âm thanh."));
            }

            // [BƯỚC 3]: Gọi Service đẩy file lên Cloudinary
            var result = await _musicService.PreUploadMusicAsync(request.File, request.Title, instructorId.Value);
            return Ok(ApiResponse<PreUploadMusicResultDto>.SuccessResponse(result, "Tải lên Cloudinary thành công."));
        }
        catch (ArgumentException ex)
        {
            // Bắt lỗi tham số (file quá 5MB, sai đuôi file) -> Phản hồi 400 Bad Request
            return BadRequest(ApiResponse<PreUploadMusicResultDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi pre-upload nhạc nền");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<PreUploadMusicResultDto>.FailureResponse("Đã xảy ra lỗi khi tải lên nhạc nền."));
        }
    }

    /// <summary>
    /// POST /api/speaking-scripts/lessons/{lessonId}/musics/link
    /// Gán danh sách các bản nhạc đã pre-upload vào bài học sau khi tạo/cập nhật bài học.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Xác thực instructorId từ JWT Token.</para>
    /// <para>Bước 2: Gọi _musicService.LinkMusicsToLessonAsync(lessonId, request.Musics, instructorId).</para>
    /// <para>Bước 3: Trả về HTTP 200 OK kèm danh sách nhạc mới được liên kết.</para>
    /// <para>Bước 4: Bắt UnauthorizedAccessException -> Trả về HTTP 403 Forbidden (không có quyền trên bài học).</para>
    /// <para>Bước 5: Bắt KeyNotFoundException -> Trả về HTTP 404 Not Found (bài học không tồn tại).</para>
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="request">Danh sách các bản nhạc cần liên kết.</param>
    /// <returns>Danh sách BackgroundMusicDto vừa được lưu.</returns>
    /// <summary>
    /// POST /api/speaking-scripts/lessons/{lessonId}/musics/link
    /// Gán danh sách nhạc đã pre-upload vào bài học sau khi tạo/cập nhật bài học
    /// </summary>
    [HttpPost("lessons/{lessonId:int}/musics/link")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<List<BackgroundMusicDto>>>> LinkMusicsToLesson(
        int lessonId, [FromBody] LinkBackgroundMusicsRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<List<BackgroundMusicDto>>.FailureResponse("Unauthorized"));

        try
        {
            // Gọi Service thực hiện liên kết hàng loạt
            var results = await _musicService.LinkMusicsToLessonAsync(lessonId, request.Musics, instructorId.Value);
            return Ok(ApiResponse<List<BackgroundMusicDto>>.SuccessResponse(results, "Đã liên kết nhạc nền với bài học."));
        }
        catch (UnauthorizedAccessException ex)
        {
            // Bắt lỗi không có quyền sở hữu bài học -> Trả về HTTP 403 Forbidden
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<List<BackgroundMusicDto>>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            // Bắt lỗi không tìm thấy bài học -> Trả về HTTP 404 Not Found
            return NotFound(ApiResponse<List<BackgroundMusicDto>>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi liên kết nhạc nền cho bài học {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<List<BackgroundMusicDto>>.FailureResponse("Đã xảy ra lỗi khi liên kết nhạc nền."));
        }
    }

    /// <summary>
    /// POST /api/speaking-scripts/lessons/{lessonId}/musics/upload
    /// Tải lên trực tiếp một file âm thanh và liên kết ngay vào bài học đã tồn tại.
    /// <para>End-to-End Flow: Kiểm tra Token -> Kiểm tra File -> Gọi Service UploadMusicForLessonAsync -> Trả về HTTP 200 OK.</para>
    /// </summary>
    /// <param name="lessonId">ID bài học.</param>
    /// <param name="request">Multipart form chứa file và tiêu đề.</param>
    /// <returns>BackgroundMusicDto sau khi lưu thành công.</returns>
    /// <summary>
    /// POST /api/speaking-scripts/lessons/{lessonId}/musics/upload
    /// Giảng viên tải lên trực tiếp file nhạc nền mới cho bài học đã có ID
    /// </summary>
    [HttpPost("lessons/{lessonId:int}/musics/upload")]
    [Authorize(Roles = "Instructor,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<BackgroundMusicDto>>> UploadMusic(
        int lessonId, [FromForm] UploadBackgroundMusicRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<BackgroundMusicDto>.FailureResponse("Unauthorized"));

        try
        {
            // Rẽ nhánh: Kiểm tra file rỗng
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(ApiResponse<BackgroundMusicDto>.FailureResponse("Vui lòng tải lên tập tin âm thanh."));
            }

            var music = await _musicService.UploadMusicForLessonAsync(
                lessonId, request.File, request.Title, instructorId.Value);

            return Ok(ApiResponse<BackgroundMusicDto>.SuccessResponse(music, "Tải lên nhạc nền thành công."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<BackgroundMusicDto>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<BackgroundMusicDto>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<BackgroundMusicDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi upload nhạc nền cho bài học {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<BackgroundMusicDto>.FailureResponse("Đã xảy ra lỗi khi tải lên nhạc nền."));
        }
    }

    /// <summary>
    /// DELETE /api/speaking-scripts/musics/{musicId}
    /// Giảng viên xóa một bản nhạc nền riêng khỏi bài học và xóa file trên Cloudinary.
    /// <para>End-to-End Flow: Xác thực Token -> Gọi Service DeleteMusicAsync -> Nếu false trả về 404 -> Bắt InvalidOperationException (xóa nhạc hệ thống) trả về 400 -> Bắt UnauthorizedAccessException trả về 403.</para>
    /// </summary>
    /// <param name="musicId">ID bản nhạc cần xóa.</param>
    /// <returns>ApiResponse chứa true nếu xóa thành công.</returns>
    /// <summary>
    /// DELETE /api/speaking-scripts/musics/{musicId}
    /// Giảng viên xóa nhạc nền riêng đã upload
    /// </summary>
    [HttpDelete("musics/{musicId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMusic(int musicId)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<bool>.FailureResponse("Unauthorized"));

        try
        {
            var success = await _musicService.DeleteMusicAsync(musicId, instructorId.Value);
            // Rẽ nhánh: Không tìm thấy bản nhạc trong CSDL
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Không tìm thấy nhạc nền cần xóa."));
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã xóa nhạc nền thành công."));
        }
        catch (InvalidOperationException ex)
        {
            // Bắt lỗi cố tình xóa nhạc mặc định của hệ thống -> Trả về HTTP 400 Bad Request
            return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            // Bắt lỗi không phải giảng viên chủ nhiệm khóa học -> Trả về HTTP 403 Forbidden
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa nhạc nền {MusicId}", musicId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<bool>.FailureResponse("Đã xảy ra lỗi khi xóa nhạc nền."));
        }
    }
}
