using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Markdig;
using MC_BE.Core.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Learning.Services;

public class ParsedScriptResult
{
    public bool Success { get; set; }
    public List<string> Errors { get; set; } = new();
    public string OriginalContent { get; set; } = string.Empty;
    public Dictionary<SpeakingLevel, ParsedLevelContent> Levels { get; set; } = new();
}

public class ParsedLevelContent
{
    public SpeakingLevel Level { get; set; }
    public string Content { get; set; } = string.Empty;
    public string CleanScriptForScoring { get; set; } = string.Empty;
}

public class SpeakingScriptParserService
{
    private readonly ILogger<SpeakingScriptParserService> _logger;

    // Level Header Regex: match `## [LEVEL: BEGINNER]` or `[LEVEL: BEGINNER]`
    private static readonly Regex LevelHeaderRegex = new(
        @"(?:##\s*)?\[LEVEL:\s*(BEGINNER|INTERMEDIATE|ADVANCED)\]",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Tag Regexes
    private static readonly Regex AllTagsRegex = new(@"\[[^\]]*\]", RegexOptions.Compiled);
    private static readonly Regex GuideTagRegex = new(@"\[HƯỚNG DẪN:[^\]]*\]", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PauseTagRegex = new(@"\[NGẮT NGHỈ:[^\]]*\]", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public SpeakingScriptParserService(ILogger<SpeakingScriptParserService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Parse uploaded file (.docx, .txt, .md) in-memory without saving to disk.
    /// Preserves full Vietnamese unicode characters.
    /// </summary>
    public async Task<ParsedScriptResult> ParseFileAsync(IFormFile file)
    {
        var result = new ParsedScriptResult();

        // 1. Validation: file existence & size (max 10MB)
        if (file == null || file.Length == 0)
        {
            result.Success = false;
            result.Errors.Add("Tập tin tải lên rỗng hoặc không tồn tại.");
            return result;
        }

        if (file.Length > 10 * 1024 * 1024)
        {
            result.Success = false;
            result.Errors.Add("Dung lượng tập tin vượt quá giới hạn cho phép (10MB).");
            return result;
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExts = new[] { ".docx", ".txt", ".md" };
        if (!allowedExts.Contains(ext))
        {
            result.Success = false;
            result.Errors.Add($"Định dạng tập tin '{ext}' không được hỗ trợ. Chỉ chấp nhận .docx, .txt, .md.");
            return result;
        }

        // 2. Extract raw text completely in-memory
        string rawText;
        try
        {
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            if (ext == ".docx")
            {
                rawText = ExtractFromDocx(memoryStream);
            }
            else if (ext == ".txt")
            {
                using var reader = new StreamReader(memoryStream, System.Text.Encoding.UTF8);
                rawText = await reader.ReadToEndAsync();
            }
            else // .md
            {
                using var reader = new StreamReader(memoryStream, System.Text.Encoding.UTF8);
                var mdContent = await reader.ReadToEndAsync();
                // We keep markdown plain text while preserving lines
                rawText = mdContent;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi đọc file tài liệu: {FileName}", file.FileName);
            result.Success = false;
            result.Errors.Add($"Không thể đọc nội dung file: {ex.Message}");
            return result;
        }

        rawText = rawText.Trim();
        if (string.IsNullOrWhiteSpace(rawText))
        {
            result.Success = false;
            result.Errors.Add("Nội dung tập tin sau khi trích xuất hoàn toàn trống.");
            return result;
        }

        result.OriginalContent = rawText;

        // 3. Parse text into sections by level
        ParseSections(rawText, result);

        return result;
    }

    /// <summary>
    /// Extract text from .docx in memory using Paragraph.InnerText to prevent splitting Vietnamese characters/runs.
    /// </summary>
    private string ExtractFromDocx(MemoryStream stream)
    {
        using var wordDoc = WordprocessingDocument.Open(stream, false);
        var body = wordDoc.MainDocumentPart?.Document.Body;
        if (body == null) return string.Empty;

        var paragraphs = body.Descendants<Paragraph>();
        var lines = paragraphs
            .Select(p => p.InnerText.Trim())
            .Where(line => !string.IsNullOrEmpty(line));

        return string.Join("\n", lines);
    }

    /// <summary>
    /// Parse sections into 3 levels: BEGINNER, INTERMEDIATE, ADVANCED.
    /// Checks for missing levels and extracts content according to exact specifications.
    /// </summary>
    public void ParseSections(string rawText, ParsedScriptResult result)
    {
        var matches = LevelHeaderRegex.Matches(rawText);

        var requiredLevels = new[] { SpeakingLevel.BEGINNER, SpeakingLevel.INTERMEDIATE, SpeakingLevel.ADVANCED };

        if (matches.Count == 0)
        {
            // If the user uploaded a plain script file without level headers,
            // automatically generate all 3 levels from the raw text!
            var cleanText = rawText.Trim();
            foreach (var reqLevel in requiredLevels)
            {
                result.Levels[reqLevel] = new ParsedLevelContent
                {
                    Level = reqLevel,
                    Content = ProcessLevelContent(cleanText, reqLevel),
                    CleanScriptForScoring = ExtractCleanScript(cleanText)
                };
            }
            result.Success = true;
            return;
        }

        var foundLevels = new Dictionary<SpeakingLevel, string>();

        for (int i = 0; i < matches.Count; i++)
        {
            var currentMatch = matches[i];
            var levelStr = currentMatch.Groups[1].Value.ToUpperInvariant();

            if (!Enum.TryParse<SpeakingLevel>(levelStr, true, out var levelEnum))
            {
                continue;
            }

            int contentStart = currentMatch.Index + currentMatch.Length;
            int contentEnd = (i + 1 < matches.Count) ? matches[i + 1].Index : rawText.Length;

            var sectionContent = rawText.Substring(contentStart, contentEnd - contentStart).Trim();
            foundLevels[levelEnum] = sectionContent;
        }

        // If any level is missing, fallback to the available parsed level or rawText
        var defaultFallback = foundLevels.Values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? rawText;

        // Extract each level per exact requirements:
        // BEGINNER: Lời thoại + [HƯỚNG DẪN] + [GIỌNG ĐỌC] + [NGẮT NGHỈ]
        // INTERMEDIATE: Lời thoại + [GIỌNG ĐỌC] (xóa bỏ [HƯỚNG DẪN] và [NGẮT NGHỈ])
        // ADVANCED: Chỉ giữ lời thoại thuần, xóa toàn bộ thẻ
        foreach (var reqLevel in requiredLevels)
        {
            var rawContent = foundLevels.ContainsKey(reqLevel) && !string.IsNullOrWhiteSpace(foundLevels[reqLevel])
                ? foundLevels[reqLevel]
                : defaultFallback;
            var processedContent = ProcessLevelContent(rawContent, reqLevel);
            var cleanForScoring = ExtractCleanScript(rawContent);

            result.Levels[reqLevel] = new ParsedLevelContent
            {
                Level = reqLevel,
                Content = processedContent,
                CleanScriptForScoring = cleanForScoring
            };
        }

        result.Success = true;
    }

    /// <summary>
    /// Processes content for a specific level.
    /// </summary>
    public string ProcessLevelContent(string rawContent, SpeakingLevel level)
    {
        if (string.IsNullOrWhiteSpace(rawContent)) return string.Empty;

        return level switch
        {
            SpeakingLevel.BEGINNER => rawContent.Trim(),
            SpeakingLevel.INTERMEDIATE =>
                // Strip [HƯỚNG DẪN:...] and [NGẮT NGHỈ:...]
                PauseTagRegex.Replace(GuideTagRegex.Replace(rawContent, ""), "").Trim(),
            SpeakingLevel.ADVANCED =>
                // Strip all tags completely
                AllTagsRegex.Replace(rawContent, "").Trim(),
            _ => rawContent.Trim()
        };
    }

    /// <summary>
    /// Strips all tags `[...]` to obtain 100% clean transcript for pronunciation scoring / speech-to-text.
    /// </summary>
    public string ExtractCleanScript(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return string.Empty;
        var clean = AllTagsRegex.Replace(content, "");
        // Normalize multiple spaces/newlines
        clean = Regex.Replace(clean, @"[ \t]+", " ");
        clean = Regex.Replace(clean, @"\n{3,}", "\n\n");
        return clean.Trim();
    }
}
