
using System.Security.Claims;
using MC_BE.Features.VoiceAssessment.DTOs;
using MC_BE.Features.VoiceAssessment.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.VoiceAssessment.Controllers;

[ApiController]
[Route("api/voice-assessment")]
[Authorize]
public class AIResponseController : ControllerBase
{
    private readonly IAIResponseService _aiResponseService;
    private readonly ILogger<AIResponseController> _logger;

    public AIResponseController(
        IAIResponseService aiResponseService,
        ILogger<AIResponseController> logger)
    {
        _aiResponseService = aiResponseService;
        _logger = logger;
    }

    private bool TryGetCurrentUserId(out int userId)
    {
        var rawId = User.FindFirst(
            ClaimTypes.NameIdentifier)?.Value;

        return int.TryParse(rawId, out userId);
    }

    // Học viên tạo đánh giá AI cho bài nộp của mình.
    [HttpPost("submissions/{submissionId:int}/feedback")]
    [ProducesResponseType(typeof(AIResponseResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateFeedback(
        int submissionId,
        [FromBody] AIResponseRequest request,
        CancellationToken cancellationToken)
    {
        if (submissionId <= 0)
            return BadRequest(new { message = "Mã bài nộp không hợp lệ." });

        if (!TryGetCurrentUserId(out var learnerId))
            return Unauthorized(new { message = "Không xác định được tài khoản." });

        try
        {
            var result = await _aiResponseService.GenerateFeedbackAsync(
                submissionId,
                learnerId,
                request,
                cancellationToken);

            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new
            {
                message = "Không tìm thấy bài nộp hoặc bạn không có quyền truy cập."
            });
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning(ex,
                "AI timeout for submission {SubmissionId}", submissionId);

            return StatusCode(504, new
            {
                message = "Dịch vụ AI phản hồi quá thời gian cho phép."
            });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex,
                "AI HTTP error for submission {SubmissionId}", submissionId);

            return StatusCode(502, new
            {
                message = "Không thể kết nối dịch vụ phân tích AI."
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex,
                "AI processing error for submission {SubmissionId}", submissionId);

            return StatusCode(502, new
            {
                message = "Không thể xử lý kết quả AI. Vui lòng thử lại."
            });
        }
    }

    // Học viên xem kết quả AI của chính mình.
    [HttpGet("submissions/{submissionId:int}/feedback")]
    [ProducesResponseType(typeof(AIResponseResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLearnerFeedback(
        int submissionId,
        CancellationToken cancellationToken)
    {
        if (submissionId <= 0)
            return BadRequest(new { message = "Mã bài nộp không hợp lệ." });

        if (!TryGetCurrentUserId(out var learnerId))
            return Unauthorized(new { message = "Không xác định được tài khoản." });

        try
        {
            var result = await _aiResponseService.GetLearnerFeedbackAsync(
                submissionId,
                learnerId,
                cancellationToken);

            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new
            {
                message = "Không tìm thấy kết quả AI hoặc bạn không có quyền truy cập."
            });
        }
    }

    // Giảng viên xem kết quả AI của bài nộp thuộc khóa học mình phụ trách.
    [HttpGet("instructor/submissions/{submissionId:int}/feedback")]
    [ProducesResponseType(typeof(AIResponseResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInstructorFeedback(
        int submissionId,
        CancellationToken cancellationToken)
    {
        if (submissionId <= 0)
            return BadRequest(new { message = "Mã bài nộp không hợp lệ." });

        if (!TryGetCurrentUserId(out var instructorId))
            return Unauthorized(new { message = "Không xác định được tài khoản." });

        try
        {
            var result = await _aiResponseService.GetInstructorFeedbackAsync(
                submissionId,
                instructorId,
                cancellationToken);

            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new
            {
                message = "Không tìm thấy kết quả AI hoặc bạn không phụ trách khóa học này."
            });
        }
    }
}
