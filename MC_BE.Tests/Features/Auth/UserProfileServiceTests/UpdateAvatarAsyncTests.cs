using System.Linq.Expressions;
using CloudinaryDotNet.Actions;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.DTOs.auth;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.UserProfileServiceTests;

public class UpdateAvatarAsyncTests : UserProfileServiceTestBase
{
    [Fact]
    public async Task UpdateAvatarAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User>());

        var request = new UpdateAvatarRequestDto { AvatarUrl = "https://example.com/avatar.png" };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenUserInactive_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "INACTIVE" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateAvatarRequestDto { AvatarUrl = "https://example.com/avatar.png" };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User is not active.");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenNoFileAndNoAvatarUrl_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateAvatarRequestDto { File = null, AvatarUrl = "   " };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Please select an avatar image file or provide an avatar URL.");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenInvalidFileExtension_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("document.pdf", "application/pdf", 100);
        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Invalid file format");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenCloudinaryUploadReturnsError_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("avatar.png", "image/png", 500);
        var uploadResult = new ImageUploadResult
        {
            Error = new Error { Message = "Cloudinary quota exceeded" }
        };

        CloudinaryMock
            .Setup(c => c.UploadImageAsync(fileMock, "mc_elearning/avatars"))
            .ReturnsAsync(uploadResult);

        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Cloudinary upload failed: Cloudinary quota exceeded");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenCloudinaryReturnsNullUrl_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("avatar.jpg", "image/jpeg", 500);
        var uploadResult = new ImageUploadResult
        {
            Error = null,
            SecureUrl = null,
            Url = null
        };

        CloudinaryMock
            .Setup(c => c.UploadImageAsync(fileMock, "mc_elearning/avatars"))
            .ReturnsAsync(uploadResult);

        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Failed to retrieve uploaded image URL from Cloudinary.");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenCloudinarySucceeds_UpdatesAvatarUrl()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE", AvatarUrl = "http://old-url.png" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("avatar.webp", "image/webp", 500);
        var uploadResult = new ImageUploadResult
        {
            SecureUrl = new Uri("https://res.cloudinary.com/test/image/upload/v1/avatar.webp")
        };

        CloudinaryMock
            .Setup(c => c.UploadImageAsync(fileMock, "mc_elearning/avatars"))
            .ReturnsAsync(uploadResult);

        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Avatar updated successfully.");
        result.Data!.AvatarUrl.Should().Be("https://res.cloudinary.com/test/image/upload/v1/avatar.webp");
        user.AvatarUrl.Should().Be("https://res.cloudinary.com/test/image/upload/v1/avatar.webp");

        UserRepoMock.Verify(r => r.Update(user), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenDirectUrlProvided_UpdatesAvatarSuccessfully()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateAvatarRequestDto
        {
            File = null,
            AvatarUrl = "  https://example.com/direct-avatar.jpg  "
        };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Avatar updated successfully.");
        result.Data!.AvatarUrl.Should().Be("https://example.com/direct-avatar.jpg");
        user.AvatarUrl.Should().Be("https://example.com/direct-avatar.jpg");

        UserRepoMock.Verify(r => r.Update(user), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenCloudinaryReturnsFallbackHttpUrl_UpdatesSuccessfully()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE", AvatarUrl = "http://old.png" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("avatar.png", "image/png", 500);
        var uploadResult = new ImageUploadResult
        {
            SecureUrl = null,
            Url = new Uri("http://res.cloudinary.com/test/image/upload/avatar.png")
        };

        CloudinaryMock
            .Setup(c => c.UploadImageAsync(fileMock, "mc_elearning/avatars"))
            .ReturnsAsync(uploadResult);

        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.AvatarUrl.Should().Be("http://res.cloudinary.com/test/image/upload/avatar.png");
        user.AvatarUrl.Should().Be("http://res.cloudinary.com/test/image/upload/avatar.png");
    }

    [Theory]
    [InlineData("avatar.jpg")]
    [InlineData("avatar.jpeg")]
    [InlineData("avatar.png")]
    [InlineData("avatar.gif")]
    [InlineData("avatar.webp")]
    public async Task UpdateAvatarAsync_WhenFileHasAllowedExtensions_UploadsSuccessfully(string fileName)
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile(fileName, "image/jpeg", 500);
        var uploadResult = new ImageUploadResult
        {
            SecureUrl = new Uri($"https://res.cloudinary.com/test/{fileName}")
        };

        CloudinaryMock
            .Setup(c => c.UploadImageAsync(fileMock, "mc_elearning/avatars"))
            .ReturnsAsync(uploadResult);

        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await Service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.AvatarUrl.Should().Be($"https://res.cloudinary.com/test/{fileName}");
    }
}
