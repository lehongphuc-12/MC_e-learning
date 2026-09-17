using System.Security.Claims;
using MC_BE.Core.DTOs;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Learning.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CertificatesController : ControllerBase
{
    private readonly ICertificateService _certificateService;

    public CertificatesController(ICertificateService certificateService)
    {
        _certificateService = certificateService;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/certificates/my-certificates
    /// Get all certificates earned by current learner
    /// </summary>
    [HttpGet("my-certificates")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<List<CertificateDto>>>> GetMyCertificates()
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<List<CertificateDto>>.FailureResponse("Unauthorized."));
        }

        var certificates = await _certificateService.GetMyCertificatesAsync(learnerId.Value);
        return Ok(ApiResponse<List<CertificateDto>>.SuccessResponse(certificates, "Certificates retrieved successfully."));
    }

    /// <summary>
    /// GET /api/certificates/course/{courseId}
    /// Get certificate for current learner by course ID
    /// </summary>
    [HttpGet("course/{courseId:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CertificateDto>>> GetCertificateByCourse(int courseId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CertificateDto>.FailureResponse("Unauthorized."));
        }

        var cert = await _certificateService.GetCertificateByCourseAsync(learnerId.Value, courseId);
        if (cert == null)
        {
            return NotFound(ApiResponse<CertificateDto>.FailureResponse("Certificate not found for this course."));
        }

        return Ok(ApiResponse<CertificateDto>.SuccessResponse(cert, "Certificate retrieved successfully."));
    }

    /// <summary>
    /// GET /api/certificates/{certificateId}
    /// Get certificate details by certificate ID
    /// </summary>
    [HttpGet("{certificateId:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CertificateDto>>> GetCertificateById(int certificateId)
    {
        var learnerId = GetCurrentUserId();
        var cert = await _certificateService.GetCertificateByIdAsync(certificateId, learnerId);
        if (cert == null)
        {
            return NotFound(ApiResponse<CertificateDto>.FailureResponse("Certificate not found or access denied."));
        }

        return Ok(ApiResponse<CertificateDto>.SuccessResponse(cert, "Certificate details retrieved successfully."));
    }

    /// <summary>
    /// POST /api/certificates/issue/{courseId}
    /// Issue certificate for current learner if 100% completed (Idempotent)
    /// </summary>
    [HttpPost("issue/{courseId:int}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CertificateDto>>> IssueCertificate(int courseId)
    {
        var learnerId = GetCurrentUserId();
        if (learnerId == null)
        {
            return Unauthorized(ApiResponse<CertificateDto>.FailureResponse("Unauthorized."));
        }

        try
        {
            var cert = await _certificateService.IssueCertificateAsync(learnerId.Value, courseId);
            if (cert == null)
            {
                return BadRequest(ApiResponse<CertificateDto>.FailureResponse("Unable to issue certificate."));
            }

            return Ok(ApiResponse<CertificateDto>.SuccessResponse(cert, "Certificate issued successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<CertificateDto>.FailureResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CertificateDto>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                ApiResponse<CertificateDto>.FailureResponse("An error occurred while issuing certificate: " + ex.Message));
        }
    }

    /// <summary>
    /// GET /api/certificates/verify/{code}
    /// Public endpoint to verify certificate authenticity by code
    /// </summary>
    [HttpGet("verify/{code}")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CertificateVerificationDto>>> VerifyCertificate(string code)
    {
        var result = await _certificateService.VerifyCertificateAsync(code);
        if (result == null || !result.IsValid)
        {
            return NotFound(ApiResponse<CertificateVerificationDto>.FailureResponse("Certificate not found or invalid."));
        }

        return Ok(ApiResponse<CertificateVerificationDto>.SuccessResponse(result, "Certificate is valid."));
    }
}
