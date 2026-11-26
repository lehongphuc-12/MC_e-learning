using MC_BE.Core.DTOs;
using MC_BE.Features.Courses.DTOs;
using MC_BE.Features.Courses.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentFormat.OpenXml;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace MC_BE.Features.Courses.Controllers;

[ApiController]
[Route("api/courses/{courseId:int}/syllabus")]
[Authorize]
public sealed class CourseSyllabusController : ControllerBase
{
    private readonly ICourseSyllabusService _syllabus;

    public CourseSyllabusController(ICourseSyllabusService syllabus) => _syllabus = syllabus;

    private int? CurrentUserId()
    {
        var value = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return int.TryParse(value, out var id) ? id : null;
    }

    [HttpGet("public-outline")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<CourseSyllabusPublicOutlineDto>>> GetPublicOutline(int courseId)
    {
        var result = await _syllabus.GetPublicOutlineAsync(courseId, CurrentUserId(), User.IsInRole("Admin"));
        return result is null
            ? NotFound(ApiResponse<CourseSyllabusPublicOutlineDto>.FailureResponse("Khóa học không tồn tại hoặc chưa được xuất bản."))
            : Ok(ApiResponse<CourseSyllabusPublicOutlineDto>.SuccessResponse(result));
    }

    [HttpPost("upload-sessions")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<SyllabusUploadSessionDto>>> CreateUploadSession(
        int courseId, [FromBody] CreateSyllabusUploadSessionRequest request)
    {
        var instructorId = CurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<SyllabusUploadSessionDto>.FailureResponse("Unauthorized."));
        try
        {
            var result = await _syllabus.CreateUploadSessionAsync(courseId, instructorId.Value, request);
            return Ok(ApiResponse<SyllabusUploadSessionDto>.SuccessResponse(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<SyllabusUploadSessionDto>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<SyllabusUploadSessionDto>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("upload-sessions/{sessionId:guid}/complete")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseSyllabusVersionDto>>> CompleteUpload(
        int courseId, Guid sessionId)
    {
        var instructorId = CurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseSyllabusVersionDto>.FailureResponse("Unauthorized."));
        try
        {
            var result = await _syllabus.CompleteUploadSessionAsync(courseId, sessionId, instructorId.Value);
            return Ok(ApiResponse<CourseSyllabusVersionDto>.SuccessResponse(result, "Đã lưu phiên bản syllabus."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<CourseSyllabusVersionDto>.FailureResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<CourseSyllabusVersionDto>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("current")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ApiResponse<CourseSyllabusVersionDto>>> GetCurrent(int courseId)
    {
        var userId = CurrentUserId();
        if (userId is null)
            return Unauthorized(ApiResponse<CourseSyllabusVersionDto>.FailureResponse("Unauthorized."));
        var result = await _syllabus.GetCurrentVersionAsync(courseId, userId.Value, User.IsInRole("Admin"));
        return result is null
            ? NotFound(ApiResponse<CourseSyllabusVersionDto>.FailureResponse("Chưa có syllabus."))
            : Ok(ApiResponse<CourseSyllabusVersionDto>.SuccessResponse(result));
    }

    [HttpGet("approved")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseSyllabusVersionDto>>> GetApproved(int courseId)
    {
        var instructorId = CurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseSyllabusVersionDto>.FailureResponse("Unauthorized."));
        var result = await _syllabus.GetApprovedVersionAsync(courseId, instructorId.Value);
        return result is null
            ? NotFound(ApiResponse<CourseSyllabusVersionDto>.FailureResponse("Chưa có syllabus được Admin duyệt."))
            : Ok(ApiResponse<CourseSyllabusVersionDto>.SuccessResponse(result));
    }

    [HttpGet("preview-draft")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<CourseSyllabusPreviewDraftDto>>> GetInstructorPreviewDraft(int courseId)
    {
        var instructorId = CurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<CourseSyllabusPreviewDraftDto>.FailureResponse("Unauthorized."));
        var result = await _syllabus.GetInstructorPreviewDraftAsync(courseId, instructorId.Value);
        return result is null
            ? NotFound(ApiResponse<CourseSyllabusPreviewDraftDto>.FailureResponse("Không tìm thấy khóa học hoặc bạn không sở hữu khóa học này."))
            : Ok(ApiResponse<CourseSyllabusPreviewDraftDto>.SuccessResponse(result));
    }

    [HttpGet("submitted")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<CourseSyllabusVersionDto>>> GetSubmitted(int courseId)
    {
        var result = await _syllabus.GetSubmittedVersionAsync(courseId);
        return result is null
            ? NotFound(ApiResponse<CourseSyllabusVersionDto>.FailureResponse("Lần gửi duyệt này chưa có phiên bản syllabus."))
            : Ok(ApiResponse<CourseSyllabusVersionDto>.SuccessResponse(result));
    }

    [HttpGet("versions/{versionId:int}/content")]
    public async Task<IActionResult> GetContent(int courseId, int versionId)
    {
        var userId = CurrentUserId();
        if (userId is null)
            return Unauthorized();
        try
        {
            var file = await _syllabus.GetVersionContentAsync(
                courseId,
                versionId,
                userId.Value,
                User.IsInRole("Admin"),
                User.IsInRole("Instructor"));
            if (file is null)
                return NotFound(ApiResponse<string>.FailureResponse("Không tìm thấy tài liệu syllabus."));

            Response.Headers.ContentDisposition = $"inline; filename*=UTF-8''{Uri.EscapeDataString(file.Value.FileName)}";
            Response.Headers.CacheControl = "private, no-store, max-age=0";
            Response.Headers.Pragma = "no-cache";
            return File(file.Value.Stream, file.Value.ContentType, enableRangeProcessing: false);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<string>.FailureResponse(ex.Message));
        }
    }

    [HttpGet("versions/{versionId:int}/preview")]
    public async Task<IActionResult> PreviewContent(int courseId, int versionId)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();
        try
        {
            var file = await _syllabus.GetVersionContentAsync(
                courseId, versionId, userId.Value, User.IsInRole("Admin"), User.IsInRole("Instructor"));
            if (file is null) return NotFound();
            if (file.Value.ContentType == "application/pdf")
            {
                Response.Headers.ContentDisposition = "inline";
                Response.Headers.CacheControl = "private, no-store, max-age=0";
                return File(file.Value.Stream, "application/pdf");
            }

            await using var source = file.Value.Stream;
            using var buffer = new MemoryStream();
            await source.CopyToAsync(buffer);
            using var word = WordprocessingDocument.Open(new MemoryStream(buffer.ToArray()), false);
            var html = new StringBuilder("<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>body{font:16px/1.65 Arial,sans-serif;color:#172033;max-width:900px;margin:32px auto;padding:0 24px;white-space:normal}.word-text{white-space:pre-wrap}p{margin:0 0 12px}h1,h2,h3{color:#102a56;line-height:1.3;margin:1.2em 0 .55em}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #cbd5e1;padding:8px;vertical-align:top}mark{background:#fff2a8}a{color:#155eef;text-decoration:underline}</style></head><body>");
            var body = word.MainDocumentPart?.Document.Body;
            if (body is not null)
            {
                foreach (var element in body.ChildElements)
                {
                    html.Append(RenderSyllabusElement(element));
                }
            }
            html.Append("</body></html>");
            Response.Headers.CacheControl = "private, no-store, max-age=0";
            return Content(html.ToString(), "text/html; charset=utf-8", Encoding.UTF8);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<string>.FailureResponse(ex.Message));
        }
    }

    [HttpDelete("versions/{versionId:int}")]
    [Authorize(Roles = "Instructor")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteVersion(int courseId, int versionId)
    {
        var instructorId = CurrentUserId();
        if (instructorId is null)
            return Unauthorized(ApiResponse<string>.FailureResponse("Unauthorized."));
        try
        {
            var deleted = await _syllabus.DeleteDraftVersionAsync(courseId, versionId, instructorId.Value);
            return deleted
                ? Ok(ApiResponse<string>.SuccessResponse("Deleted", "Đã xóa phiên bản syllabus nháp và lên lịch dọn file R2."))
                : NotFound(ApiResponse<string>.FailureResponse("Không tìm thấy phiên bản syllabus."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<string>.FailureResponse(ex.Message));
        }
    }

    private static string RenderSyllabusElement(OpenXmlElement element)
    {
        if (element is Paragraph paragraph)
        {
            var styleId = paragraph.ParagraphProperties?.ParagraphStyleId?.Val?.Value;
            var tag = styleId?.StartsWith("Heading1", StringComparison.OrdinalIgnoreCase) == true ? "h1"
                : styleId?.StartsWith("Heading2", StringComparison.OrdinalIgnoreCase) == true ? "h2"
                : styleId?.StartsWith("Heading3", StringComparison.OrdinalIgnoreCase) == true ? "h3" : "p";
            var styles = new List<string>();
            var alignment = paragraph.ParagraphProperties?.Justification?.Val?.Value.ToString();
            if (alignment is not null)
            {
                var cssAlignment = alignment.ToUpperInvariant() switch
                {
                    "CENTER" => "center",
                    "RIGHT" => "right",
                    "BOTH" or "DISTRIBUTE" => "justify",
                    _ => "left",
                };
                styles.Add($"text-align:{cssAlignment}");
            }
            var indentation = paragraph.ParagraphProperties?.Indentation;
            if (TryWordTwipsToPixels(indentation?.Left?.Value, out var leftIndent) && leftIndent > 0)
                styles.Add($"margin-left:{leftIndent}px");
            var styleAttribute = styles.Count > 0 ? $" style=\"{string.Join(';', styles)}\"" : string.Empty;
            var content = new StringBuilder();
            foreach (var child in paragraph.ChildElements)
                content.Append(RenderSyllabusElement(child));
            return $"<{tag}{styleAttribute}><span class=\"word-text\">{content}</span></{tag}>";
        }

        if (element is Run run)
        {
            var content = new StringBuilder();
            foreach (var child in run.ChildElements)
            {
                if (child is Text text)
                    content.Append(WebUtility.HtmlEncode(text.Text));
                else if (child is Break)
                    content.Append("<br>");
                else if (child is TabChar)
                    content.Append("&#9;");
                else if (child is NoBreakHyphen)
                    content.Append("&#8209;");
                else if (child is SoftHyphen)
                    content.Append("&shy;");
            }

            var properties = run.RunProperties;
            if (properties is null || content.Length == 0)
                return content.ToString();

            var formatted = content.ToString();
            if (IsEnabled(properties.Bold)) formatted = $"<strong>{formatted}</strong>";
            if (IsEnabled(properties.Italic)) formatted = $"<em>{formatted}</em>";
            if (properties.Underline is not null && properties.Underline.Val?.Value != UnderlineValues.None)
                formatted = $"<u>{formatted}</u>";
            if (IsEnabled(properties.Strike) || IsEnabled(properties.DoubleStrike))
                formatted = $"<s>{formatted}</s>";
            if (properties.Highlight is not null)
                formatted = $"<mark>{formatted}</mark>";

            var styles = new List<string>();
            var color = properties.Color?.Val?.Value;
            if (!string.IsNullOrWhiteSpace(color) && Regex.IsMatch(color, "^[0-9A-Fa-f]{6}$"))
                styles.Add($"color:#{color}");
            var halfPoints = properties.FontSize?.Val?.Value;
            if (double.TryParse(halfPoints, out var sizeInHalfPoints) && sizeInHalfPoints is >= 12 and <= 144)
                styles.Add($"font-size:{sizeInHalfPoints / 2:0.##}pt");
            if (styles.Count > 0)
                formatted = $"<span style=\"{string.Join(';', styles)}\">{formatted}</span>";
            return formatted;
        }

        if (element is Table table)
        {
            var html = new StringBuilder("<table><tbody>");
            foreach (var row in table.Elements<TableRow>())
            {
                html.Append("<tr>");
                foreach (var cell in row.Elements<TableCell>())
                {
                    html.Append("<td>");
                    foreach (var child in cell.ChildElements)
                        html.Append(RenderSyllabusElement(child));
                    html.Append("</td>");
                }
                html.Append("</tr>");
            }
            return html.Append("</tbody></table>").ToString();
        }

        if (element.ChildElements.Count == 0)
            return string.Empty;
        var nestedContent = new StringBuilder();
        foreach (var child in element.ChildElements)
            nestedContent.Append(RenderSyllabusElement(child));
        return nestedContent.ToString();
    }

    private static bool IsEnabled(OnOffType? property) =>
        property is not null && property.Val?.Value != false;

    private static bool TryWordTwipsToPixels(string? value, out double pixels)
    {
        pixels = 0;
        if (!int.TryParse(value, out var twips)) return false;
        pixels = Math.Round(twips * 96d / 1440d, 2);
        return true;
    }
}
