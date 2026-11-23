
using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Shared.Services.Interfaces;
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
    private readonly IRemedialAssignmentService _remedialAssignments;
    private readonly ICourseLearningAccessService _courseAccess;
    private readonly ICloudinaryService _cloudinaryService;

    public SpeakingScriptController(
        ISpeakingScriptService scriptService,
        ILogger<SpeakingScriptController> logger,
        IRemedialAssignmentService remedialAssignments,
        ICourseLearningAccessService courseAccess,
        ICloudinaryService cloudinaryService)
    {
        _scriptService = scriptService;
        _logger = logger;
        _remedialAssignments = remedialAssignments;
        _courseAccess = courseAccess;
        _cloudinaryService = cloudinaryService;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    private bool IsLearner => User.IsInRole("Learner");

    private async Task<bool> CanReadForLearnerAsync(SpeakingScriptDto script, int learnerId) =>
        await _courseAccess.CanAccessCourseAsync(script.CourseId, learnerId, isAdmin: false) &&
        (!script.IsRemedial || await _remedialAssignments.CanAccessContentAsync(learnerId, "SPEAKING", script.ScriptId));

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
            var scripts = await _scriptService.GetAllScriptsAsync(courseId, scope, moduleId, lessonId, search);
            if (IsLearner)
            {
                var learnerId = GetCurrentUserId();
                if (learnerId == null) return Unauthorized();
                var allowed = new List<SpeakingScriptDto>();
                foreach (var item in scripts)
                    if (await CanReadForLearnerAsync(item, learnerId.Value)) allowed.Add(item);
                scripts = allowed;
            }
            return Ok(ApiResponse<IEnumerable<SpeakingScriptDto>>.SuccessResponse(scripts));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting speaking scripts");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingScriptDto>>.FailureResponse("Không thể tải danh sách kịch bản bài tập nói."));
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptDto>>> GetScriptById(int id)
    {
        try
        {
            var script = await _scriptService.GetScriptByIdAsync(id);
            if (script == null)
            {
                return NotFound(ApiResponse<SpeakingScriptDto>.FailureResponse("Không tìm thấy kịch bản nói."));
            }
            if (IsLearner && (GetCurrentUserId() is not int learnerId || !await CanReadForLearnerAsync(script, learnerId))) return Forbid();

            return Ok(ApiResponse<SpeakingScriptDto>.SuccessResponse(script));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting speaking script {Id}", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Không thể tải chi tiết kịch bản nói."));
        }
    }

    [HttpGet("course/{courseId:int}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SpeakingScriptDto>>>> GetScriptsByCourse(int courseId)
    {
        try
        {
            var scripts = await _scriptService.GetScriptsByCourseAsync(courseId);
            if (IsLearner)
            {
                var learnerId = GetCurrentUserId();
                if (learnerId == null) return Unauthorized();
                var allowed = new List<SpeakingScriptDto>();
                foreach (var item in scripts)
                    if (await CanReadForLearnerAsync(item, learnerId.Value)) allowed.Add(item);
                scripts = allowed;
            }
            return Ok(ApiResponse<IEnumerable<SpeakingScriptDto>>.SuccessResponse(scripts));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting speaking scripts for Course {CourseId}", courseId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<IEnumerable<SpeakingScriptDto>>.FailureResponse("Không thể tải kịch bản nói của khóa học."));
        }
    }

    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptDto>>> CreateScript([FromBody] CreateSpeakingScriptRequest request)
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating speaking script");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Đã xảy ra lỗi khi tạo bài tập nói."));
        }
    }

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
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating speaking script {Id}", id);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Đã xảy ra lỗi khi cập nhật bài tập nói."));
        }
    }

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

    [HttpPost("upload-sample-audio")]
    [Authorize(Roles = "Instructor,Admin")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<string>>> UploadSampleAudio([FromForm] UploadSampleAudioRequest request)
    {
        var instructorId = GetCurrentUserId();
        if (instructorId == null)
            return Unauthorized(ApiResponse<string>.FailureResponse("Unauthorized"));

        try
        {
            var file = request?.File;
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<string>.FailureResponse("Vui lòng chọn tập tin âm thanh đọc mẫu."));
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac" };
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(ApiResponse<string>.FailureResponse("Định dạng âm thanh không hợp lệ. Chỉ chấp nhận các file .mp3, .wav, .m4a, .ogg, .webm, .aac."));
            }

            if (file.Length > 25 * 1024 * 1024)
            {
                return BadRequest(ApiResponse<string>.FailureResponse("Dung lượng tập tin âm thanh mẫu không được vượt quá 25MB."));
            }

            var uploadResult = await _cloudinaryService.UploadVideoAsync(file, "speaking-scripts/sample-audios");
            if (uploadResult == null || uploadResult.Error != null || string.IsNullOrEmpty(uploadResult.SecureUrl?.ToString()))
            {
                _logger.LogError("Cloudinary sample audio upload failed: {Error}", uploadResult?.Error?.Message);
                return StatusCode(500, ApiResponse<string>.FailureResponse("Không thể tải tập tin âm thanh lên máy chủ lưu trữ."));
            }

            return Ok(ApiResponse<string>.SuccessResponse(uploadResult.SecureUrl.ToString(), "Tải lên audio mẫu thành công."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi upload audio mẫu bài tập nói");
            return StatusCode(500, ApiResponse<string>.FailureResponse($"Lỗi khi tải file: {ex.Message}"));
        }
    }

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
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<SpeakingScriptDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving script for Lesson {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Đã xảy ra lỗi khi lưu kịch bản."));
        }
    }

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
            if (IsLearner && (GetCurrentUserId() is not int learnerId || !await CanReadForLearnerAsync(script, learnerId))) return Forbid();

            return Ok(ApiResponse<SpeakingScriptDto>.SuccessResponse(script));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving script for Lesson {LessonId}", lessonId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<SpeakingScriptDto>.FailureResponse("Không thể tải kịch bản nói."));
        }
    }

    [HttpGet("lessons/{lessonId:int}/level/{level}")]
    public async Task<ActionResult<ApiResponse<SpeakingScriptLevelDto>>> GetLevelContent(int lessonId, SpeakingLevel level)
    {
        try
        {
            var script = await _scriptService.GetScriptByLessonAsync(lessonId);
            if (script == null) return NotFound(ApiResponse<SpeakingScriptLevelDto>.FailureResponse("Chưa có kịch bản cho bài tập nói này."));
            if (IsLearner && (GetCurrentUserId() is not int learnerId || !await CanReadForLearnerAsync(script, learnerId))) return Forbid();
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
