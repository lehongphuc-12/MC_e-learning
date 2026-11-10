using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.DTOs.auth;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class ResetPasswordAsyncTests : AuthServiceTestBase
{
    [Theory]
    [InlineData("", "user@example.com", "NewPass")]
    [InlineData("token", "", "NewPass")]
    [InlineData("token", "user@example.com", "")]
    public async Task ResetPasswordAsync_WhenRequiredFieldsEmpty_ReturnsFailure(string token, string email, string newPass)
    {
        // Arrange
        var request = new ResetPasswordRequestDto { Token = token, Email = email, NewPassword = newPass };

        // Act
        var result = await Service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Token, Email, and New Password are required.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        var request = new ResetPasswordRequestDto { Token = "token123", Email = "notfound@example.com", NewPassword = "NewPassword123" };

        // Act
        var result = await Service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid password reset request.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenTokenNotFound_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User { UserId = 1, Email = "user@example.com" });
        var request = new ResetPasswordRequestDto { Token = "wrong_token", Email = "user@example.com", NewPassword = "NewPassword123" };

        // Act
        var result = await Service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid or expired password reset token.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenTokenIsAlreadyUsed_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User { UserId = 1, Email = "user@example.com" });
        ResetTokens.Add(new PasswordResetToken
        {
            UserId = 1,
            Token = "used_token",
            IsUsed = true,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });

        var request = new ResetPasswordRequestDto { Token = "used_token", Email = "user@example.com", NewPassword = "NewPassword123" };

        // Act
        var result = await Service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("This password reset link has already been used. Please request a new link.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenTokenIsExpired_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User { UserId = 1, Email = "user@example.com" });
        ResetTokens.Add(new PasswordResetToken
        {
            UserId = 1,
            Token = "expired_token",
            IsUsed = false,
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5)
        });

        var request = new ResetPasswordRequestDto { Token = "expired_token", Email = "user@example.com", NewPassword = "NewPassword123" };

        // Act
        var result = await Service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("This password reset link has expired. Please request a new link.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenTokenValid_UpdatesPasswordAndMarksTokenUsed()
    {
        // Arrange
        var user = new User { UserId = 1, Email = "user@example.com", PasswordHash = "old_hash" };
        Users.Add(user);

        var tokenEntity = new PasswordResetToken
        {
            UserId = 1,
            Token = "valid_token",
            IsUsed = false,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };
        ResetTokens.Add(tokenEntity);

        var request = new ResetPasswordRequestDto { Token = "valid_token", Email = "user@example.com", NewPassword = "BrandNewPassword123" };

        // Act
        var result = await Service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Contain("Your password has been reset successfully");
        user.PasswordHash.Should().Be("hashed_BrandNewPassword123");
        tokenEntity.IsUsed.Should().BeTrue();
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenEmailHasSpacesAndUppercase_NormalizesEmailAndSucceeds()
    {
        // Arrange
        var user = new User { UserId = 2, Email = "user@example.com", PasswordHash = "old_hash" };
        Users.Add(user);

        var tokenEntity = new PasswordResetToken
        {
            UserId = 2,
            Token = "valid_case_token",
            IsUsed = false,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };
        ResetTokens.Add(tokenEntity);

        var request = new ResetPasswordRequestDto { Token = "valid_case_token", Email = "  USER@EXAMPLE.COM  ", NewPassword = "NewPassword123" };

        // Act
        var result = await Service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeTrue();
        user.PasswordHash.Should().Be("hashed_NewPassword123");
        tokenEntity.IsUsed.Should().BeTrue();
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }
}
