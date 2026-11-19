
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
[Route("api/speaking-submissions")]
[Authorize]
public class SpeakingSubmissionsController : ControllerBase
{
    private readonly ISpeakingSubmissionService _submissionService;
    private readonly ILogger<SpeakingSubmissionsController> _logger;

    public SpeakingSubmissionsController(
        ISpeakingSubmissionService submissionService,
        ILogger<SpeakingSubmissionsController> logger)
    {
        _submissionService = submissionService;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<SpeakingSubmissionResponseDto>>> SubmitSpeakingAssignment(
        [FromForm] CreateSpeakingSubmissionRequest request)
    {

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

            var result = await _submissionService.SubmitSpeakingAssignmentAsync(learnerId.Value, request);

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

            if (submission == null)
            {
                return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(null!, "No submission yet for this lesson."));
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

            if (submission == null)
            {
                return Ok(ApiResponse<SpeakingSubmissionResponseDto>.SuccessResponse(null!, "No submission yet for this script."));
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

            var gradedSubmission = await _submissionService.GradeSubmissionAsync(instructorId.Value, submissionId, request);

            if (gradedSubmission == null)
            {
                return NotFound(ApiResponse<SpeakingSubmissionResponseDto>.FailureResponse("Submission not found."));
            }

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
