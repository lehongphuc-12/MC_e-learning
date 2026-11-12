using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.DTOs.auth;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class ChangePasswordAsyncTests : AuthServiceTestBase
{
    [Fact]
    public async Task ChangePasswordAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Act
        var result = await Service.ChangePasswordAsync(99, new ChangePasswordRequestDto());

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenUserInactive_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User { UserId = 1, Status = "INACTIVE" });

        // Act
        var result = await Service.ChangePasswordAsync(1, new ChangePasswordRequestDto());

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User account is inactive.");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task ChangePasswordAsync_WhenStandardUserAndOldPasswordEmptyOrWhitespace_ReturnsFailure(string? oldPassword)
    {
        // Arrange
        Users.Add(new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = "hashed_OldPass",
            IsGoogleLogin = false
        });

        var request = new ChangePasswordRequestDto { OldPassword = oldPassword, NewPassword = "NewPass" };

        // Act
        var result = await Service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Old password is required.");
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenStandardUserAndOldPasswordIncorrect_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = "hashed_CorrectOldPass",
            IsGoogleLogin = false
        });

        var request = new ChangePasswordRequestDto { OldPassword = "WrongOldPass", NewPassword = "NewPass" };

        // Act
        var result = await Service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Incorrect old password.");
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenStandardUserAndOldPasswordCorrect_UpdatesPasswordSuccessfully()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = "hashed_CorrectOldPass",
            IsGoogleLogin = false
        };
        Users.Add(user);

        var request = new ChangePasswordRequestDto { OldPassword = "CorrectOldPass", NewPassword = "BrandNewPassword123" };

        // Act
        var result = await Service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Password changed successfully.");
        user.PasswordHash.Should().Be("hashed_BrandNewPassword123");
        user.IsGoogleLogin.Should().BeFalse();
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenGoogleUser_ChangesPasswordWithoutOldPassword()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = null,
            IsGoogleLogin = true
        };
        Users.Add(user);

        var request = new ChangePasswordRequestDto { OldPassword = null, NewPassword = "FirstTimePassword123" };

        // Act
        var result = await Service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Password changed successfully.");
        user.PasswordHash.Should().Be("hashed_FirstTimePassword123");
        user.IsGoogleLogin.Should().BeFalse(); // Google user converted to standard credentials
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenUserHasNullPasswordHash_AllowsChangeWithoutOldPassword()
    {
        // Arrange (Standard account without password hash set yet)
        var user = new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = null,
            IsGoogleLogin = false
        };
        Users.Add(user);

        var request = new ChangePasswordRequestDto { OldPassword = null, NewPassword = "NewPassword123" };

        // Act
        var result = await Service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Password changed successfully.");
        user.PasswordHash.Should().Be("hashed_NewPassword123");
    }
}
