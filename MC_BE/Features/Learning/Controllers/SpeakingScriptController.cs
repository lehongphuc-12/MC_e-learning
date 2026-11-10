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

[ApiController]
[Route("api/speaking-scripts")]
[Authorize]
public class SpeakingScriptController : ControllerBase
{
    private readonly ISpeakingScriptService _scriptService;
    private readonly ILogger<SpeakingScriptController> _logger;

    public SpeakingScriptController(
        ISpeakingScriptService scriptService,
        ILogger<SpeakingScriptController> logger)
    {
        _scriptService = scriptService;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

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
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(ApiResponse<ParsePreviewDto>.FailureResponse("Vui lòng tải lên tập tin kịch bản."));
            }

            var preview = await _scriptService.ParseFileDirectAsync(request.File);

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
