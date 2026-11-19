using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptParserServiceTests;

public class ParseFileAsyncTests : SpeakingScriptParserServiceTestBase
{
    [Fact]
    public async Task ParseFileAsync_WhenValidTxtFileWithLevels_ParsesSuccessfully()
    {
        // Arrange
        var content = @"
## [LEVEL: BEGINNER]
Xin chào quý vị [HƯỚNG DẪN: mỉm cười] [GIỌNG ĐỌC: vui tươi]. Chúc một ngày tốt lành!

## [LEVEL: INTERMEDIATE]
Xin chào quý vị [GIỌNG ĐỌC: vui tươi]. Chúc một ngày tốt lành!

## [LEVEL: ADVANCED]
Xin chào quý vị. Chúc một ngày tốt lành!
";
        var file = CreateMockTxtFile("script.txt", content);

        // Act
        var result = await Service.ParseFileAsync(file);

        // Assert
        result.Success.Should().BeTrue();
        result.Errors.Should().BeEmpty();
        result.Levels.Should().ContainKey(SpeakingLevel.BEGINNER);
        result.Levels.Should().ContainKey(SpeakingLevel.INTERMEDIATE);
        result.Levels.Should().ContainKey(SpeakingLevel.ADVANCED);
        result.Levels[SpeakingLevel.BEGINNER].Content.Should().Contain("[HƯỚNG DẪN: mỉm cười]");
        result.Levels[SpeakingLevel.INTERMEDIATE].Content.Should().NotContain("[HƯỚNG DẪN: mỉm cười]");
        result.Levels[SpeakingLevel.ADVANCED].CleanScriptForScoring.Should().Be("Xin chào quý vị. Chúc một ngày tốt lành!");
    }

    [Fact]
    public async Task ParseFileAsync_WhenValidMdFile_ParsesSuccessfully()
    {
        // Arrange
        var content = @"
# Kịch bản dẫn chương trình
[LEVEL: BEGINNER]
Chào mừng các bạn đến với hội thảo hôm nay [NGẮT NGHỈ: 1s].

[LEVEL: INTERMEDIATE]
Chào mừng các bạn đến với hội thảo hôm nay.

[LEVEL: ADVANCED]
Chào mừng các bạn đến với hội thảo hôm nay.
";
        var file = CreateMockMdFile("script.md", content);

        // Act
        var result = await Service.ParseFileAsync(file);

        // Assert
        result.Success.Should().BeTrue();
        result.Errors.Should().BeEmpty();
        result.OriginalContent.Should().Contain("Chào mừng các bạn");
    }

    [Fact]
    public async Task ParseFileAsync_WhenValidDocxFile_ParsesSuccessfully()
    {
        // Arrange
        var file = CreateMockDocxFile("speech.docx",
            "[LEVEL: BEGINNER]",
            "Kính thưa quý vị đại biểu [HƯỚNG DẪN: trang trọng].",
            "[LEVEL: INTERMEDIATE]",
            "Kính thưa quý vị đại biểu.",
            "[LEVEL: ADVANCED]",
            "Kính thưa quý vị đại biểu.");

        // Act
        var result = await Service.ParseFileAsync(file);

        // Assert
        result.Success.Should().BeTrue();
        result.Errors.Should().BeEmpty();
        result.Levels[SpeakingLevel.BEGINNER].Content.Should().Contain("Kính thưa quý vị đại biểu");
    }

    [Fact]
    public async Task ParseFileAsync_WhenFileIsNull_ReturnsFailure()
    {
        // Arrange
        IFormFile? file = null;

        // Act
        var result = await Service.ParseFileAsync(file!);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain("Tập tin tải lên rỗng hoặc không tồn tại.");
    }

    [Fact]
    public async Task ParseFileAsync_WhenFileLengthIsZero_ReturnsFailure()
    {
        // Arrange
        var file = CreateMockEmptyFile("empty.txt");

        // Act
        var result = await Service.ParseFileAsync(file);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain("Tập tin tải lên rỗng hoặc không tồn tại.");
    }

    [Fact]
    public async Task ParseFileAsync_WhenFileExtensionNotSupported_ReturnsFailure()
    {
        // Arrange
        var file = CreateMockCustomFile("presentation.pdf", new byte[] { 1, 2, 3 });

        // Act
        var result = await Service.ParseFileAsync(file);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain("Định dạng tập tin '.pdf' không được hỗ trợ. Chỉ chấp nhận .docx, .txt, .md.");
    }

    [Fact]
    public async Task ParseFileAsync_WhenCorruptedDocxFileUploaded_CatchesExceptionAndReturnsFailure()
    {
        // Arrange: invalid byte sequence that is not a valid zip/docx package
        var file = CreateMockCustomFile("corrupt.docx", new byte[] { 0x00, 0x01, 0x02, 0x03 });

        // Act
        var result = await Service.ParseFileAsync(file);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().ContainMatch("Không thể đọc nội dung file:*");
    }

    [Fact]
    public async Task ParseFileAsync_WhenFileLengthExceeds10MB_ReturnsFailure()
    {
        // Arrange
        var file = CreateMockOversizedFile("heavy.txt", 10 * 1024 * 1024 + 1);

        // Act
        var result = await Service.ParseFileAsync(file);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain("Dung lượng tập tin vượt quá giới hạn cho phép (10MB).");
    }

    [Fact]
    public async Task ParseFileAsync_WhenExtractedContentIsWhitespaceOnly_ReturnsFailure()
    {
        // Arrange
        var file = CreateMockTxtFile("spaces.txt", "     \n\t   \r\n   ");

        // Act
        var result = await Service.ParseFileAsync(file);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain("Nội dung tập tin sau khi trích xuất hoàn toàn trống.");
    }
}
