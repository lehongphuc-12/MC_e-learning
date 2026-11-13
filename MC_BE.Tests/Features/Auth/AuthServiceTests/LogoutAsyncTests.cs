using FluentAssertions;
using MC_BE.Core.Entities;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class LogoutAsyncTests : AuthServiceTestBase
{
    [Fact]
    public async Task LogoutAsync_WhenTokenExistsAndIsActive_RevokesTokenAndClearsCookie()
    {
        // Arrange
        var tokenEntity = new RefreshToken
        {
            Token = "active_logout_token",
            UserId = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(1)
        };
        RefreshTokens.Add(tokenEntity);

        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LogoutAsync("active_logout_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Logged out successfully.");
        tokenEntity.IsRevoked.Should().BeTrue();
        TokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenEmptyOrNotFound_StillClearsCookie()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LogoutAsync(null, httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Logged out successfully.");
        TokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenProvidedViaCookie_RevokesTokenAndClearsCookie()
    {
        // Arrange
        var tokenEntity = new RefreshToken
        {
            Token = "cookie_logout_token",
            UserId = 1,
            ExpiresAt = DateTime.UtcNow.AddDays(1)
        };
        RefreshTokens.Add(tokenEntity);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.Append("Cookie", "refreshToken=cookie_logout_token");

        // Act
        var result = await Service.LogoutAsync(null, httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        tokenEntity.IsRevoked.Should().BeTrue();
        TokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenAlreadyRevoked_DoesNotUpdateAgainButClearsCookie()
    {
        // Arrange
        var tokenEntity = new RefreshToken
        {
            Token = "already_revoked_token",
            UserId = 1,
            RevokedAt = DateTime.UtcNow.AddHours(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(1)
        };
        RefreshTokens.Add(tokenEntity);

        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.LogoutAsync("already_revoked_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        UserRepoMock.Verify(r => r.Update(It.IsAny<User>()), Times.Never);
        TokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
    }
}
