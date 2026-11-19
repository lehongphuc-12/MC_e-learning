using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptServiceTests;

public class ParseFileDirectAsyncTests : SpeakingScriptServiceTestBase
{
    [Fact]
    public async Task ParseFileDirectAsync_WhenValidFile_ReturnsPreviewWithLevels()
    {
        // Arrange
        var content = @"
## [LEVEL: BEGINNER]
Lời thoại cơ bản [HƯỚNG DẪN: cười]

## [LEVEL: INTERMEDIATE]
Lời thoại trung cấp [GIỌNG ĐỌC: tự tin]

## [LEVEL: ADVANCED]
Lời thoại nâng cao
";
        var file = CreateMockTxtFile("script.txt", content);

        // Act
        var result = await Service.ParseFileDirectAsync(file);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Levels.Should().HaveCount(3);
        result.Levels.Should().Contain(l => l.Level == SpeakingLevel.BEGINNER);
        result.Levels.Should().Contain(l => l.Level == SpeakingLevel.INTERMEDIATE);
        result.Levels.Should().Contain(l => l.Level == SpeakingLevel.ADVANCED);
    }

    [Fact]
    public async Task ParseFileDirectAsync_WhenInvalidFormat_ReturnsFailure()
    {
        // Arrange
        var file = CreateMockCustomFile("doc.pdf", new byte[] { 1, 2, 3 });

        // Act
        var result = await Service.ParseFileDirectAsync(file);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ParseFileDirectAsync_WhenEmptyFile_ReturnsFailure()
    {
        // Arrange
        var file = CreateMockEmptyFile("empty.txt");

        // Act
        var result = await Service.ParseFileDirectAsync(file);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain("Tập tin tải lên rỗng hoặc không tồn tại.");
    }
}
