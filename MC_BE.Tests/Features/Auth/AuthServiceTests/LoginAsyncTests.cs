using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.DTOs;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class LoginAsyncTests : AuthServiceTestBase
{
    [Fact]
    public async Task LoginAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        var request = new LoginRequest { Email = "notfound@example.com", Password = "Pass" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid email or password.");
    }

    [Fact]
    public async Task LoginAsync_WhenUserIsInactive_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User
        {
            Email = "inactive@example.com",
            PasswordHash = "hashed_Pass123",
            Status = "INACTIVE"
        });

        var request = new LoginRequest { Email = "inactive@example.com", Password = "Pass123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("This account has been deactivated.");
    }

    [Fact]
    public async Task LoginAsync_WhenGoogleAccountOrPasswordHashEmpty_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User
        {
            Email = "google@example.com",
            IsGoogleLogin = true,
            PasswordHash = null,
            Status = "ACTIVE"
        });

        var request = new LoginRequest { Email = "google@example.com", Password = "Pass123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.");
    }

    [Fact]
    public async Task LoginAsync_WhenPasswordIsIncorrect_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User
        {
            Email = "user@example.com",
            PasswordHash = "hashed_CorrectPassword",
            Status = "ACTIVE"
        });

        var request = new LoginRequest { Email = "user@example.com", Password = "WrongPassword" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid email or password.");
    }

    [Fact]
    public async Task LoginAsync_WhenCredentialsValid_ReturnsSuccessAndSetsCookie()
    {
        // Arrange
        var role = new Role { RoleId = 1, RoleName = "Learner" };
        var user = new User
        {
            UserId = 1,
            FullName = "Jane Doe",
            Email = "jane@example.com",
            PasswordHash = "hashed_Password123",
            Status = "ACTIVE",
            Role = role
        };
        Users.Add(user);

        var request = new LoginRequest { Email = "jane@example.com", Password = "Password123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Login successful.");
        result.Data.Should().NotBeNull();
        result.Data!.Token.Should().Be("mock_jwt_token");
        result.Data.User.FullName.Should().Be("Jane Doe");
        result.Data.User.RoleName.Should().Be("Learner");

        user.LastLoginAt.Should().NotBeNull();
        RefreshTokens.Should().ContainSingle(t => t.UserId == 1);
        TokenServiceMock.Verify(t => t.SetRefreshTokenCookie(httpContext.Response, It.IsAny<string>(), It.IsAny<DateTime>()), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WhenAccountIsCurrentlyLockedOut_ReturnsFailureWithRemainingMinutes()
    {
        // Arrange
        var lockoutExpiry = DateTime.UtcNow.AddMinutes(10);
        Users.Add(new User
        {
            Email = "locked@example.com",
            PasswordHash = "hashed_Pass123",
            Status = "ACTIVE",
            LockoutUntil = lockoutExpiry
        });

        var request = new LoginRequest { Email = "locked@example.com", Password = "Pass123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().StartWith("Account is temporarily locked. Please try again in ");
        PasswordHasherMock.Verify(p => p.VerifyPassword(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task LoginAsync_WhenAccountLockoutHasExpired_AllowsLoginWithCorrectPassword()
    {
        // Arrange
        var expiredLockout = DateTime.UtcNow.AddMinutes(-5);
        var user = new User
        {
            UserId = 1,
            FullName = "Unlocked User",
            Email = "unlocked@example.com",
            PasswordHash = "hashed_Pass123",
            Status = "ACTIVE",
            LockoutUntil = expiredLockout,
            FailedLoginAttempts = 5
        };
        Users.Add(user);

        var request = new LoginRequest { Email = "unlocked@example.com", Password = "Pass123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Login successful.");
        user.LockoutUntil.Should().BeNull();
        user.FailedLoginAttempts.Should().Be(0);
    }

    [Fact]
    public async Task LoginAsync_WhenPasswordIsIncorrect_IncrementsFailedAttemptsCounter()
    {
        // Arrange
        var user = new User
        {
            Email = "failedcounter@example.com",
            PasswordHash = "hashed_CorrectPassword",
            Status = "ACTIVE",
            FailedLoginAttempts = 2
        };
        Users.Add(user);

        var request = new LoginRequest { Email = "failedcounter@example.com", Password = "WrongPassword" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid email or password.");
        user.FailedLoginAttempts.Should().Be(3);
        user.LockoutUntil.Should().BeNull();
        UserRepoMock.Verify(r => r.Update(user), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WhenPasswordFailsConsecutivelyToMaxAttempts_LocksAccountAndResetsFailedCounter()
    {
        // Arrange
        var user = new User
        {
            Email = "maxfailed@example.com",
            PasswordHash = "hashed_CorrectPassword",
            Status = "ACTIVE",
            FailedLoginAttempts = 4 // 5th attempt triggers lockout
        };
        Users.Add(user);

        var request = new LoginRequest { Email = "maxfailed@example.com", Password = "WrongPassword" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Too many failed attempts. Account locked for 15 minutes.");
        user.FailedLoginAttempts.Should().Be(0);
        user.LockoutUntil.Should().NotBeNull();
        user.LockoutUntil!.Value.Should().BeAfter(DateTime.UtcNow.AddMinutes(14));
        UserRepoMock.Verify(r => r.Update(user), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_WhenEmailHasUppercaseAndSpaces_NormalizesAndLogsInSuccessfully()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            FullName = "Normalized User",
            Email = "normal@example.com",
            PasswordHash = "hashed_Password123",
            Status = "ACTIVE"
        };
        Users.Add(user);

        var request = new LoginRequest { Email = "  NORMAL@EXAMPLE.COM  ", Password = "Password123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.User.Email.Should().Be("normal@example.com");
    }
}
