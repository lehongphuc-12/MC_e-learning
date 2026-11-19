using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptParserServiceTests;

public class ProcessLevelContentTests : SpeakingScriptParserServiceTestBase
{
    [Fact]
    public void ProcessLevelContent_WhenBeginner_KeepsAllTags()
    {
        // Arrange
        var rawContent = "Chào các bạn [HƯỚNG DẪN: mỉm cười] [NGẮT NGHỈ: 2s] [GIỌNG ĐỌC: truyền cảm] nhé.";

        // Act
        var result = Service.ProcessLevelContent(rawContent, SpeakingLevel.BEGINNER);

        // Assert
        result.Should().Be("Chào các bạn [HƯỚNG DẪN: mỉm cười] [NGẮT NGHỈ: 2s] [GIỌNG ĐỌC: truyền cảm] nhé.");
    }

    [Fact]
    public void ProcessLevelContent_WhenIntermediate_StripsGuideAndPauseTagsWhileRetainingToneTags()
    {
        // Arrange
        var rawContent = "Chào các bạn [HƯỚNG DẪN: mỉm cười] [NGẮT NGHỈ: 2s] [GIỌNG ĐỌC: truyền cảm] nhé.";

        // Act
        var result = Service.ProcessLevelContent(rawContent, SpeakingLevel.INTERMEDIATE);

        // Assert
        result.Should().Be("Chào các bạn   [GIỌNG ĐỌC: truyền cảm] nhé.");
        result.Should().NotContain("[HƯỚNG DẪN: mỉm cười]");
        result.Should().NotContain("[NGẮT NGHỈ: 2s]");
        result.Should().Contain("[GIỌNG ĐỌC: truyền cảm]");
    }

    [Fact]
    public void ProcessLevelContent_WhenAdvanced_StripsAllTags()
    {
        // Arrange
        var rawContent = "Chào các bạn [HƯỚNG DẪN: mỉm cười] [NGẮT NGHỈ: 2s] [GIỌNG ĐỌC: truyền cảm] nhé.";

        // Act
        var result = Service.ProcessLevelContent(rawContent, SpeakingLevel.ADVANCED);

        // Assert
        result.Should().Be("Chào các bạn    nhé.");
        result.Should().NotContain("[");
        result.Should().NotContain("]");
    }

    [Fact]
    public void ProcessLevelContent_WhenUnknownLevelEnum_ReturnsTrimmedRawContent()
    {
        // Arrange
        var rawContent = "   Nội dung không rõ cấp độ   ";

        // Act
        var result = Service.ProcessLevelContent(rawContent, (SpeakingLevel)999);

        // Assert
        result.Should().Be("Nội dung không rõ cấp độ");
    }

    [Fact]
    public void ProcessLevelContent_WhenRawContentIsEmptyOrWhitespace_ReturnsEmptyString()
    {
        // Act
        var nullResult = Service.ProcessLevelContent(null!, SpeakingLevel.BEGINNER);
        var emptyResult = Service.ProcessLevelContent("", SpeakingLevel.INTERMEDIATE);
        var whitespaceResult = Service.ProcessLevelContent("    ", SpeakingLevel.ADVANCED);

        // Assert
        nullResult.Should().BeEmpty();
        emptyResult.Should().BeEmpty();
        whitespaceResult.Should().BeEmpty();
    }
}
