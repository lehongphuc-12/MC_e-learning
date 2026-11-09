using FluentAssertions;
using MC_BE.Features.Auth.DTOs.auth;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class GoogleLoginAsyncTests : AuthServiceTestBase
{
    [Fact]
    public async Task GoogleLoginAsync_WhenIdTokenIsEmpty_ReturnsFailure()
    {
        // Arrange
        var request = new GoogleLoginRequest { IdToken = "" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.GoogleLoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Google ID Token is required.");
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenIdTokenIsWhitespace_ReturnsFailure()
    {
        // Arrange
        var request = new GoogleLoginRequest { IdToken = "   " };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.GoogleLoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Google ID Token is required.");
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenIdTokenIsInvalid_CatchesExceptionAndReturnsFailure()
    {
        // Arrange
        var request = new GoogleLoginRequest { IdToken = "invalid_google_jwt_token" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await Service.GoogleLoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().StartWith("Invalid Google token:");
    }
}
