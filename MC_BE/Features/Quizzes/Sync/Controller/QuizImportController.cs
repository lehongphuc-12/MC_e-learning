
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Quizzes.Sync;

[ApiController]
[Route("api/quizzes/import")]
[Authorize(Roles = "Instructor")]
public sealed class QuizImportController(QuizSheetReader reader, QuizImportService importer, QuizSheetExporter exporter, ILogger<QuizImportController> logger) : ControllerBase
{
    private int? UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static string PreviewToken(QuizImportPreview preview, int courseId, int lessonId, string title, int instructorId)
    {
        var canonical = JsonSerializer.Serialize(new { courseId, lessonId, title = title.Trim(), instructorId, quiz = preview.Quiz });
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
    }

    [HttpPost("google/export/{quizId:int}")]
    public async Task<IActionResult> ExportQuiz(int quizId, CancellationToken ct)
    {
        if (UserId is not int id) return Unauthorized();
        if (!await importer.OwnsQuizAsync(quizId, id, ct)) return Forbid();

        try
        {
            var rowsWritten = await exporter.ExportAsync(quizId, ct);
            return Ok(new { success = true, rowsWritten, sheetsSync = "success" });
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("SAFE_SYNC_BLOCKED:", StringComparison.Ordinal))
        {
            logger.LogWarning(ex, "Google Sheets export blocked for Quiz {QuizId}", quizId);
            return Conflict(new { success = false, sheetsSync = "blocked", message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Google Sheet export failed for quiz {QuizId}", quizId);
            return StatusCode(502, new { success = false, sheetsSync = "failed", message = "Export failed; the quiz in the database is unchanged." });
        }
    }

    [HttpGet("google/preview")]
    public async Task<IActionResult> PreviewGoogle([FromQuery] int courseId, [FromQuery] int lessonId, [FromQuery] string title, CancellationToken ct)
    {
        if (UserId is not int id) return Unauthorized();

        try
        {
            var preview = await importer.PreviewAsync(await reader.ReadGoogleAsync(ct), courseId, lessonId, title, id, ct);
            return Ok(new
            {
                preview.Quiz,
                preview.Errors,
                preview.QuestionCount,
                preview.CanImport,
                previewToken = preview.CanImport ? PreviewToken(preview, courseId, lessonId, title, id) : null
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Google Sheet preview failed");
            return StatusCode(502, new { message = "Could not read Google Sheets. Check logs and access." });
        }
    }

    [HttpPost("google/confirm")]
    public async Task<IActionResult> ConfirmGoogle([FromQuery] int courseId, [FromQuery] int lessonId, [FromQuery] string title, [FromQuery] string? previewToken, CancellationToken ct)
    {
        if (UserId is not int id) return Unauthorized();
        if (string.IsNullOrWhiteSpace(previewToken)) return BadRequest(new { message = "Preview first and provide previewToken." });

        try
        {
            var data = await reader.ReadGoogleAsync(ct);
            var preview = await importer.PreviewAsync(data, courseId, lessonId, title, id, ct);

            if (!preview.CanImport)
                return Conflict(new { message = "Source or database no longer validates. Preview again.", preview.Errors });

            if (!string.Equals(previewToken, PreviewToken(preview, courseId, lessonId, title, id), StringComparison.OrdinalIgnoreCase))
                return Conflict(new { message = "Quiz data changed since preview. Preview again before confirming." });

            var quiz = await importer.ImportAsync(data, courseId, lessonId, title, id, ct);
            return Ok(new { success = true, quiz, sheetsSync = "source-google-sheets" });
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Google Sheet import failed");
            return StatusCode(500, new { message = "Import failed. Check server logs before retrying." });
        }
    }

    [HttpPost("excel/preview")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> PreviewExcel(IFormFile file, [FromForm] int courseId, [FromForm] int lessonId, [FromForm] string title, CancellationToken ct)
    {
        if (UserId is not int id) return Unauthorized();
        if (file == null || file.Length == 0 || file.Length > 15 * 1024 * 1024 ||
            !Path.GetExtension(file.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Provide a .xlsx file up to 15 MB." });

        try
        {
            using var stream = file.OpenReadStream();
            var preview = await importer.PreviewAsync(QuizSheetReader.ReadExcel(stream), courseId, lessonId, title, id, ct);

            return Ok(new
            {
                preview.Quiz,
                preview.Errors,
                preview.QuestionCount,
                preview.CanImport,
                previewToken = preview.CanImport ? PreviewToken(preview, courseId, lessonId, title, id) : null
            });
        }
        catch (Exception ex) when (ex is InvalidDataException or System.Xml.XmlException or IOException or ArgumentException)
        {
            return BadRequest(new { message = "Invalid Excel file: " + ex.Message });
        }
    }

    [HttpPost("excel/confirm")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> ConfirmExcel(IFormFile file, [FromForm] int courseId, [FromForm] int lessonId, [FromForm] string title, [FromForm] string? previewToken, CancellationToken ct)
    {
        if (UserId is not int id) return Unauthorized();
        if (file == null || file.Length == 0 || file.Length > 15 * 1024 * 1024 ||
            !Path.GetExtension(file.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Provide a .xlsx file up to 15 MB." });

        if (string.IsNullOrWhiteSpace(previewToken))
            return BadRequest(new { message = "Preview first and provide previewToken." });

        try
        {
            using var stream = file.OpenReadStream();
            var data = QuizSheetReader.ReadExcel(stream);
            var preview = await importer.PreviewAsync(data, courseId, lessonId, title, id, ct);

            if (!preview.CanImport)
                return Conflict(new { message = "Excel or database no longer validates. Preview again.", preview.Errors });

            if (!string.Equals(previewToken, PreviewToken(preview, courseId, lessonId, title, id), StringComparison.OrdinalIgnoreCase))
                return Conflict(new { message = "Excel data changed since preview. Preview again before confirming." });

            var quiz = await importer.ImportAsync(data, courseId, lessonId, title, id, ct);

            // Sau khi lưu Database thành công, tự động Export sang Google Sheets.
            try
            {
                var rowsWritten = await exporter.ExportAsync(quiz.QuizId, ct);
                return Ok(new
                {
                    success = true,
                    quiz,
                    sheetsSync = "success",
                    rowsWritten,
                    message = "Quiz imported and exported to Google Sheets successfully."
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.StartsWith("SAFE_SYNC_BLOCKED:", StringComparison.Ordinal))
            {
                logger.LogWarning(ex, "Google Sheets sync blocked for Quiz {QuizId}", quiz.QuizId);
                return Ok(new
                {
                    success = true,
                    quiz,
                    sheetsSync = "blocked",
                    rowsWritten = (int?)null,
                    message = "Quiz saved to database, but Google Sheets sync was blocked to protect existing data."
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Automatic Google Sheets export failed for Quiz {QuizId}", quiz.QuizId);
                return Ok(new
                {
                    success = true,
                    quiz,
                    sheetsSync = "failed",
                    rowsWritten = (int?)null,
                    message = "Quiz saved to database, but Google Sheets export failed. Retry synchronization later."
                });
            }
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (Exception ex) when (ex is InvalidDataException or System.Xml.XmlException or IOException)
        {
            return BadRequest(new { message = "Invalid Excel file: " + ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Excel import failed");
            return StatusCode(500, new { message = "Import failed. Check logs before retrying." });
        }
    }
}
