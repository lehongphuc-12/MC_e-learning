using FluentAssertions;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.Services;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptParserServiceTests;

public class ParseSectionsTests : SpeakingScriptParserServiceTestBase
{
    [Fact]
    public async Task ParseSections_WhenAllThreeLevelsPresent_ParsesEachLevelCorrectly()
    {
        // Arrange
        var rawText = @"
## [LEVEL: BEGINNER]
Lời thoại cơ bản [HƯỚNG DẪN: mỉm cười] [GIỌNG ĐỌC: vui]

## [LEVEL: INTERMEDIATE]
Lời thoại trung cấp [GIỌNG ĐỌC: tự tin]

## [LEVEL: ADVANCED]
Lời thoại nâng cao tự do
";
        var result = new ParsedScriptResult();

        // Act
        Service.ParseSections(rawText, result);

        // Assert
        result.Success.Should().BeTrue();
        result.Levels.Should().HaveCount(3);
        result.Levels[SpeakingLevel.BEGINNER].Content.Should().Contain("[HƯỚNG DẪN: mỉm cười]");
        result.Levels[SpeakingLevel.INTERMEDIATE].Content.Should().NotContain("[HƯỚNG DẪN: mỉm cười]");
        result.Levels[SpeakingLevel.INTERMEDIATE].Content.Should().Contain("[GIỌNG ĐỌC: tự tin]");
        result.Levels[SpeakingLevel.ADVANCED].Content.Should().Be("Lời thoại nâng cao tự do");
    }

    [Fact]
    public async Task ParseSections_WhenInvalidLevelHeaderPresent_IgnoresInvalidAndParsesValid()
    {
        // Arrange
        var rawText = @"
[LEVEL: MASTER]
Lời thoại không hợp lệ

[LEVEL: BEGINNER]
Lời thoại hợp lệ cho beginner [GIỌNG ĐỌC: ấm áp]
";
        var result = new ParsedScriptResult();

        // Act
        Service.ParseSections(rawText, result);

        // Assert
        result.Success.Should().BeTrue();
        result.Levels.Should().ContainKey(SpeakingLevel.BEGINNER);
        result.Levels[SpeakingLevel.BEGINNER].Content.Should().Contain("Lời thoại hợp lệ");
        // Remaining levels fallback to beginner content
        result.Levels[SpeakingLevel.INTERMEDIATE].Content.Should().Contain("Lời thoại hợp lệ");
        result.Levels[SpeakingLevel.ADVANCED].Content.Should().Contain("Lời thoại hợp lệ");
    }

    [Fact]
    public async Task ParseSections_WhenNoLevelHeadersPresent_AutoGeneratesAllThreeLevelsFromRawText()
    {
        // Arrange: plain text without any level headers
        var rawText = "Xin chào tất cả các bạn [HƯỚNG DẪN: cười nhẹ] đã đến với khóa học.";
        var result = new ParsedScriptResult();

        // Act
        Service.ParseSections(rawText, result);

        // Assert
        result.Success.Should().BeTrue();
        result.Levels.Should().HaveCount(3);
        result.Levels[SpeakingLevel.BEGINNER].Content.Should().Contain("[HƯỚNG DẪN: cười nhẹ]");
        result.Levels[SpeakingLevel.INTERMEDIATE].Content.Should().NotContain("[HƯỚNG DẪN: cười nhẹ]");
        result.Levels[SpeakingLevel.ADVANCED].Content.Should().Be("Xin chào tất cả các bạn  đã đến với khóa học.");
        result.Levels[SpeakingLevel.ADVANCED].CleanScriptForScoring.Should().Be("Xin chào tất cả các bạn đã đến với khóa học.");
    }

    [Fact]
    public async Task ParseSections_WhenOnlyBeginnerHeaderPresent_FallsBackRemainingLevels()
    {
        // Arrange
        var rawText = @"
[LEVEL: BEGINNER]
Nội dung bài nói duy nhất [NGẮT NGHỈ: 2s] [GIỌNG ĐỌC: tự hào]
";
        var result = new ParsedScriptResult();

        // Act
        Service.ParseSections(rawText, result);

        // Assert
        result.Success.Should().BeTrue();
        result.Levels[SpeakingLevel.BEGINNER].Content.Should().Contain("[NGẮT NGHỈ: 2s]");
        result.Levels[SpeakingLevel.INTERMEDIATE].Content.Should().NotContain("[NGẮT NGHỈ: 2s]");
        result.Levels[SpeakingLevel.INTERMEDIATE].Content.Should().Contain("[GIỌNG ĐỌC: tự hào]");
        result.Levels[SpeakingLevel.ADVANCED].Content.Should().Be("Nội dung bài nói duy nhất");
    }
}
