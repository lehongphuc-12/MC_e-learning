using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptParserServiceTests;

public class ExtractCleanScriptTests : SpeakingScriptParserServiceTestBase
{
    [Fact]
    public void ExtractCleanScript_WhenContentHasVariousTagsAndSpaces_StripsAllTagsAndNormalizesWhitespace()
    {
        // Arrange
        var content = "Xin chào [HƯỚNG DẪN: cười] các bạn [NGẮT NGHỈ: 1s]   hôm nay [GIỌNG ĐỌC: vui] rất vui.";

        // Act
        var result = Service.ExtractCleanScript(content);

        // Assert
        result.Should().Be("Xin chào các bạn hôm nay rất vui.");
    }

    [Fact]
    public void ExtractCleanScript_WhenContentContainsConsecutiveEmptyTags_StripsCleanly()
    {
        // Arrange
        var content = "[TAG1][TAG2][TAG3] Nội dung chính [TAG4]";

        // Act
        var result = Service.ExtractCleanScript(content);

        // Assert
        result.Should().Be("Nội dung chính");
    }

    [Fact]
    public void ExtractCleanScript_WhenContentIsEmptyOrWhitespace_ReturnsEmptyString()
    {
        // Act
        var nullResult = Service.ExtractCleanScript(null!);
        var emptyResult = Service.ExtractCleanScript("");
        var whitespaceResult = Service.ExtractCleanScript("   \t  \r\n  ");

        // Assert
        nullResult.Should().BeEmpty();
        emptyResult.Should().BeEmpty();
        whitespaceResult.Should().BeEmpty();
    }

    [Fact]
    public void ExtractCleanScript_WhenContentHasExcessiveNewlines_NormalizesToDoubleNewline()
    {
        // Arrange
        var content = "Đoạn một\n\n\n\n\nĐoạn hai";

        // Act
        var result = Service.ExtractCleanScript(content);

        // Assert
        result.Should().Be("Đoạn một\n\nĐoạn hai");
    }
}
