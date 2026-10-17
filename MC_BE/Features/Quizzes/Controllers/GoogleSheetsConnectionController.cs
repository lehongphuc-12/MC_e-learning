
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MC_BE.Features.Quizzes.Controllers;

[ApiController]
[Route("api/google-sheets")]
[Authorize(Roles = "Admin")]
public class GoogleSheetsConnectionController : ControllerBase
{
    private const string SpreadsheetId = "1SIV9GdGHGgYlHioSqcWhGg6Xm6IPz9FLYJR4updgKMs";

    [HttpGet("test-connection")]
    public async Task<IActionResult> TestConnection(CancellationToken cancellationToken)
    {
        try
        {
            var credentialsPath = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");

            if (string.IsNullOrWhiteSpace(credentialsPath) || !System.IO.File.Exists(credentialsPath))
                return StatusCode(503, new { success = false, message = "GOOGLE_APPLICATION_CREDENTIALS is missing or the credentials file does not exist." });

            var credential = await GoogleCredential.FromFileAsync(credentialsPath, cancellationToken);
            credential = credential.CreateScoped(SheetsService.Scope.SpreadsheetsReadonly);

            using var sheetsService = new SheetsService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "MSEEK LMS"
            });

            var request = sheetsService.Spreadsheets.Get(SpreadsheetId);
            request.Fields = "spreadsheetId,properties(title),sheets(properties(title,gridProperties(rowCount,columnCount)))";

            var spreadsheet = await request.ExecuteAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                message = "Connected to Google Sheets successfully.",
                spreadsheetTitle = spreadsheet.Properties?.Title,
                sheets = spreadsheet.Sheets?.Select(s => new
                {
                    name = s.Properties?.Title,
                    rows = s.Properties?.GridProperties?.RowCount,
                    columns = s.Properties?.GridProperties?.ColumnCount
                })
            });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new
            {
                success = false,
                message = "Google Sheets connection failed.",
                errorType = ex.GetType().Name
            });
        }
    }
}
