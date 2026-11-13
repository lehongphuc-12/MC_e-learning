using FluentAssertions;
using MC_BE.Core.Entities;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class RefreshTokenAsyncTests : AuthServiceTestBase
{
    [Fact]
    public async Task RefreshTokenAsync_WhenNoTokenProvided_ReturnsFailure()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.RefreshTokenAsync(null, httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Refresh token is required.");
    }

    [Fact]
    public async Task RefreshTokenAsync_WhenTokenNotFoundOrInactive_ClearsCookieAndReturnsFailure()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.Append("Cookie", "refreshToken=nonexistent_token");

        // Act
        var result = await Service.RefreshTokenAsync(null, httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid or expired refresh token.");
        TokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
    }

    [Fact]
    public async Task RefreshTokenAsync_WhenTokenIsExpired_ClearsCookieAndReturnsFailure()
    {
        // Arrange
        var expiredToken = new RefreshToken
        {
            Token = "expired_token",
            UserId = 1,
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5),
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        RefreshTokens.Add(expiredToken);

        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.RefreshTokenAsync("expired_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid or expired refresh token.");
        TokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
    }

    [Fact]
    public async Task RefreshTokenAsync_WhenUserIsInactive_ClearsCookieAndReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "INACTIVE" };
        var activeToken = new RefreshToken
        {
            Token = "valid_token",
            UserId = 1,
            User = user,
            ExpiresAt = DateTime.UtcNow.AddDays(1)
        };
        RefreshTokens.Add(activeToken);

        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.RefreshTokenAsync("valid_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User account is inactive.");
        TokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
    }

    [Fact]
    public async Task RefreshTokenAsync_WhenTokenValid_RotatesTokenAndReturnsSuccess()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        var activeToken = new RefreshToken
        {
            Token = "valid_token",
            UserId = 1,
            User = user,
            ExpiresAt = DateTime.UtcNow.AddDays(1)
        };
        RefreshTokens.Add(activeToken);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.Append("Cookie", "refreshToken=valid_token");

        // Act
        var result = await Service.RefreshTokenAsync(null, httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Token refreshed successfully.");
        result.Data!.AccessToken.Should().Be("mock_jwt_token");

        activeToken.IsRevoked.Should().BeTrue();
        activeToken.ReplacedByToken.Should().NotBeNullOrEmpty();
        RefreshTokens.Should().HaveCount(2); // Old revoked + new active
        TokenServiceMock.Verify(t => t.SetRefreshTokenCookie(httpContext.Response, It.IsAny<string>(), It.IsAny<DateTime>()), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task RefreshTokenAsync_WhenTokenProvidedInRequestBody_RotatesTokenAndSucceeds()
    {
        // Arrange (No cookie present, token passed as parameter)
        var user = new User { UserId = 1, Status = "ACTIVE" };
        var activeToken = new RefreshToken
        {
            Token = "body_token",
            UserId = 1,
            User = user,
            ExpiresAt = DateTime.UtcNow.AddDays(1)
        };
        RefreshTokens.Add(activeToken);

        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.RefreshTokenAsync("body_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.AccessToken.Should().Be("mock_jwt_token");
        activeToken.IsRevoked.Should().BeTrue();
    }

    [Fact]
    public async Task RefreshTokenAsync_WhenCookieAndParameterBothProvided_PrefersCookie()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        var cookieToken = new RefreshToken
        {
            Token = "cookie_token",
            UserId = 1,
            User = user,
            ExpiresAt = DateTime.UtcNow.AddDays(1)
        };
        RefreshTokens.Add(cookieToken);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.Append("Cookie", "refreshToken=cookie_token");

        // Act (Pass different body token, service should use cookie token)
        var result = await Service.RefreshTokenAsync("different_body_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        cookieToken.IsRevoked.Should().BeTrue();
    }
}
