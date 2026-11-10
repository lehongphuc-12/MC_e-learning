using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Controllers;

[ApiController]
[Route("api/speaking-scripts")]
[Authorize]
public class BackgroundMusicController : ControllerBase
{
    private readonly IBackgroundMusicService _musicService;
    private readonly ILogger<BackgroundMusicController> _logger;

    public BackgroundMusicController(
        IBackgroundMusicService musicService,
        ILogger<BackgroundMusicController> logger)
    {
        _musicService = musicService;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/speaking-scripts/musics/defaults
    /// Lấy danh sách 4 bài nhạc nền hệ thống mặc định
    /// </summary>
    [HttpGet("musics/defaults")]
    public async Task<ActionResult<ApiResponse<List<BackgroundMusicDto>>>> GetDefaultMusics()
    {
        try
        {
            var musics = await _musicService.GetDefaultMusicsAsync();
            return Ok(ApiResponse<List<BackgroundMusicDto>>.SuccessResponse(musics));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách nhạc nền mặc định");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<List<BackgroundMusicDto>>.FailureResponse("Không thể tải danh sách nhạc nền mặc định."));
        }
    }

    /// <summary>
    /// GET /api/speaking-scripts/lessons/{lessonId}/musics
    /// Lấy danh sách nhạc khả dụng cho bài học (nhạc hệ thống + nhạc giảng viên upload)
    /// </summary>
    [HttpGet("lessons/{lessonId:int}/musics")]
    public async Task<ActionResult<ApiResponse<List<BackgroundMusicDto>>>> GetMusicsForLesson(int lessonId)
    {
        try
        {
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
    /// Upload trước file nhạc lên Cloudinary khi giảng viên chọn file trong modal
    /// </summary>
    [HttpPost("musics/pre-upload")]
    [Authorize(Roles = "Instructor,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<PreUploadMusicResultDto>>> PreUploadMusic(
        [FromForm] UploadBackgroundMusicRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<PreUploadMusicResultDto>.FailureResponse("Unauthorized"));

        try
        {
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(ApiResponse<PreUploadMusicResultDto>.FailureResponse("Vui lòng tải lên tập tin âm thanh."));
            }

            var result = await _musicService.PreUploadMusicAsync(request.File, request.Title, instructorId.Value);
            return Ok(ApiResponse<PreUploadMusicResultDto>.SuccessResponse(result, "Tải lên Cloudinary thành công."));
        }
        catch (ArgumentException ex)
        {
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
            var results = await _musicService.LinkMusicsToLessonAsync(lessonId, request.Musics, instructorId.Value);
            return Ok(ApiResponse<List<BackgroundMusicDto>>.SuccessResponse(results, "Đã liên kết nhạc nền với bài học."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<List<BackgroundMusicDto>>.FailureResponse(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
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
            if (!success)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Không tìm thấy nhạc nền cần xóa."));
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Đã xóa nhạc nền thành công."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
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
