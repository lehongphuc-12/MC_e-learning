using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.DTOs.auth;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class ForgotPasswordAsyncTests : AuthServiceTestBase
{
    [Fact]
    public async Task ForgotPasswordAsync_WhenEmailIsEmpty_ReturnsFailure()
    {
        // Act
        var result = await Service.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "   " });

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Email is required.");
    }

    [Fact]
    public async Task ForgotPasswordAsync_WhenUserNotFound_ReturnsSuccessWithoutSendingEmail()
    {
        // Act
        var result = await Service.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "unknown@example.com" });

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Contain("If an account exists for this email");
        EmailServiceMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task ForgotPasswordAsync_WhenUserFound_SavesTokenAndSendsEmail()
    {
        // Arrange
        Users.Add(new User
        {
            UserId = 1,
            FullName = "Forgot User",
            Email = "forgot@example.com",
            Status = "ACTIVE"
        });

        // Act
        var result = await Service.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "forgot@example.com" });

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Contain("If an account exists for this email");
        ResetTokens.Should().ContainSingle(t => t.UserId == 1 && !t.IsUsed);
        EmailServiceMock.Verify(e => e.SendEmailAsync("forgot@example.com", It.IsAny<string>(), It.IsAny<string>(), true), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ForgotPasswordAsync_WhenClientUrlConfigIsMissing_FallsBackToDefaultUrl()
    {
        // Arrange
        ConfigMock.Setup(c => c["ClientUrl"]).Returns((string?)null);
        Users.Add(new User
        {
            UserId = 10,
            FullName = "Forgot User Default Url",
            Email = "defaulturl@example.com",
            Status = "ACTIVE"
        });

        // Act
        var result = await Service.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "defaulturl@example.com" });

        // Assert
        result.Success.Should().BeTrue();
        EmailServiceMock.Verify(e => e.SendEmailAsync(
            "defaulturl@example.com",
            It.IsAny<string>(),
            It.Is<string>(body => body.Contains("http://localhost:5173/reset-password")),
            true), Times.Once);
    }

    [Fact]
    public async Task ForgotPasswordAsync_WhenEmailHasSpacesAndUppercase_NormalizesAndSendsEmail()
    {
        // Arrange
        Users.Add(new User
        {
            UserId = 11,
            FullName = "Spaces User",
            Email = "spaces@example.com",
            Status = "ACTIVE"
        });

        // Act
        var result = await Service.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "  SPACES@EXAMPLE.COM  " });

        // Assert
        result.Success.Should().BeTrue();
        EmailServiceMock.Verify(e => e.SendEmailAsync("spaces@example.com", It.IsAny<string>(), It.IsAny<string>(), true), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }
}
