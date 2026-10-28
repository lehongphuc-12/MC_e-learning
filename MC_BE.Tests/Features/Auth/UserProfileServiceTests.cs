using System.Linq.Expressions;
using System.Text;
using CloudinaryDotNet.Actions;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.DTOs.auth;
using MC_BE.Features.Auth.Services;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using EntityRole = MC_BE.Core.Entities.Role;

namespace MC_BE.Tests.Features.Auth;

public class UserProfileServiceTests
{
    private readonly Mock<IGenericRepository<User>> _userRepoMock;
    private readonly Mock<IGenericRepository<UserProfile>> _userProfileRepoMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<ICloudinaryService> _cloudinaryMock;
    private readonly UserProfileService _service;

    public UserProfileServiceTests()
    {
        _userRepoMock = new Mock<IGenericRepository<User>>();
        _userProfileRepoMock = new Mock<IGenericRepository<UserProfile>>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _cloudinaryMock = new Mock<ICloudinaryService>();

        _service = new UserProfileService(
            _userRepoMock.Object,
            _userProfileRepoMock.Object,
            _unitOfWorkMock.Object,
            _cloudinaryMock.Object
        );
    }

    #region GetProfileAsync Tests

    [Fact]
    public async Task GetProfileAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User>());

        var request = new GetProfileRequestDto { UserId = 99 };

        // Act
        var result = await _service.GetProfileAsync(request, currentUserId: 1);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
        result.Data.Should().BeNull();
    }

    [Fact]
    public async Task GetProfileAsync_WhenUserNotActive_ReturnsFailure()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            FullName = "John Doe",
            Status = "INACTIVE"
        };

        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new GetProfileRequestDto { UserId = 1 };

        // Act
        var result = await _service.GetProfileAsync(request, currentUserId: 1);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User is not active.");
    }

    [Fact]
    public async Task GetProfileAsync_WhenUserActive_ReturnsUserProfileDto()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            FullName = "John Doe",
            Email = "john@example.com",
            PhoneNumber = "0123456789",
            AvatarUrl = "http://avatar.url/img.png",
            Status = "ACTIVE",
            Role = new EntityRole { RoleId = 1, RoleName = "Learner" },
            UserProfile = new UserProfile
            {
                Bio = "Coding enthusiast",
                Gender = "Male",
                DateOfBirth = new DateOnly(2000, 1, 1),
                ExperienceLevel = "Beginner",
                LearningGoal = "Learn C#",
                PreferredLanguage = "vi"
            }
        };

        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new GetProfileRequestDto { UserId = null }; // tests fallback to currentUserId

        // Act
        var result = await _service.GetProfileAsync(request, currentUserId: 1);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("User profile retrieved successfully.");
        result.Data.Should().NotBeNull();
        result.Data!.UserId.Should().Be(1);
        result.Data.FullName.Should().Be("John Doe");
        result.Data.Email.Should().Be("john@example.com");
        result.Data.RoleName.Should().Be("Learner");
        result.Data.Bio.Should().Be("Coding enthusiast");
        result.Data.PreferredLanguage.Should().Be("vi");
    }

    #endregion

    #region UpdateProfileAsync Tests

    [Fact]
    public async Task UpdateProfileAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User>());

        var request = new UpdateProfileRequestDto { FullName = "Updated Name" };

        // Act
        var result = await _service.UpdateProfileAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenUserInactive_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "SUSPENDED" };
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateProfileRequestDto { FullName = "Updated Name" };

        // Act
        var result = await _service.UpdateProfileAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User is not active.");
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenUserProfileIsNull_CreatesProfileAndUpdatesUser()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            FullName = "Old Name",
            PhoneNumber = "0000000000",
            Status = "ACTIVE",
            UserProfile = null
        };

        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateProfileRequestDto
        {
            FullName = "  New Name  ",
            PhoneNumber = "  0987654321  ",
            Bio = "New Bio",
            Gender = "Female",
            DateOfBirth = new DateOnly(1995, 5, 20),
            ExperienceLevel = "Intermediate",
            LearningGoal = "Learn Backend",
            PreferredLanguage = "en"
        };

        // Act
        var result = await _service.UpdateProfileAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Profile updated successfully.");
        result.Data!.FullName.Should().Be("New Name");
        result.Data.PhoneNumber.Should().Be("0987654321");
        result.Data.Bio.Should().Be("New Bio");
        result.Data.Gender.Should().Be("Female");
        result.Data.DateOfBirth.Should().Be(new DateOnly(1995, 5, 20));
        result.Data.ExperienceLevel.Should().Be("Intermediate");
        result.Data.LearningGoal.Should().Be("Learn Backend");
        result.Data.PreferredLanguage.Should().Be("en");

        _userProfileRepoMock.Verify(r => r.AddAsync(It.Is<UserProfile>(p => p.UserId == 1)), Times.Once);
        _userRepoMock.Verify(r => r.Update(user), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenUserProfileExists_UpdatesExistingProfile()
    {
        // Arrange
        var existingProfile = new UserProfile
        {
            UserId = 1,
            Bio = "Old Bio",
            Gender = "Male",
            PreferredLanguage = "en"
        };
        var user = new User
        {
            UserId = 1,
            FullName = "Existing User",
            Status = "ACTIVE",
            UserProfile = existingProfile
        };

        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateProfileRequestDto
        {
            Bio = "Updated Bio",
            LearningGoal = "Master C#"
        };

        // Act
        var result = await _service.UpdateProfileAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Bio.Should().Be("Updated Bio");
        result.Data.LearningGoal.Should().Be("Master C#");
        result.Data.Gender.Should().Be("Male"); // Unchanged

        _userProfileRepoMock.Verify(r => r.AddAsync(It.IsAny<UserProfile>()), Times.Never);
        _userRepoMock.Verify(r => r.Update(user), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    #endregion

    #region UpdateAvatarAsync Tests

    [Fact]
    public async Task UpdateAvatarAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User>());

        var request = new UpdateAvatarRequestDto { AvatarUrl = "https://example.com/avatar.png" };

        // Act
        var result = await _service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenUserInactive_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "INACTIVE" };
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateAvatarRequestDto { AvatarUrl = "https://example.com/avatar.png" };

        // Act
        var result = await _service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User is not active.");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenNoFileAndNoAvatarUrl_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateAvatarRequestDto { File = null, AvatarUrl = "   " };

        // Act
        var result = await _service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Please select an avatar image file or provide an avatar URL.");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenInvalidFileExtension_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("document.pdf", "application/pdf", 100);
        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await _service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Invalid file format");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenCloudinaryUploadReturnsError_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("avatar.png", "image/png", 500);
        var uploadResult = new ImageUploadResult
        {
            Error = new Error { Message = "Cloudinary quota exceeded" }
        };

        _cloudinaryMock
            .Setup(c => c.UploadImageAsync(fileMock, "mc_elearning/avatars"))
            .ReturnsAsync(uploadResult);

        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await _service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Cloudinary upload failed: Cloudinary quota exceeded");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenCloudinaryReturnsNullUrl_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("avatar.jpg", "image/jpeg", 500);
        var uploadResult = new ImageUploadResult
        {
            Error = null,
            SecureUrl = null,
            Url = null
        };

        _cloudinaryMock
            .Setup(c => c.UploadImageAsync(fileMock, "mc_elearning/avatars"))
            .ReturnsAsync(uploadResult);

        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await _service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Failed to retrieve uploaded image URL from Cloudinary.");
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenCloudinarySucceeds_UpdatesAvatarUrl()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE", AvatarUrl = "http://old-url.png" };
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var fileMock = CreateMockFormFile("avatar.webp", "image/webp", 500);
        var uploadResult = new ImageUploadResult
        {
            SecureUrl = new Uri("https://res.cloudinary.com/test/image/upload/v1/avatar.webp")
        };

        _cloudinaryMock
            .Setup(c => c.UploadImageAsync(fileMock, "mc_elearning/avatars"))
            .ReturnsAsync(uploadResult);

        var request = new UpdateAvatarRequestDto { File = fileMock };

        // Act
        var result = await _service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Avatar updated successfully.");
        result.Data!.AvatarUrl.Should().Be("https://res.cloudinary.com/test/image/upload/v1/avatar.webp");
        user.AvatarUrl.Should().Be("https://res.cloudinary.com/test/image/upload/v1/avatar.webp");

        _userRepoMock.Verify(r => r.Update(user), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateAvatarAsync_WhenDirectUrlProvided_UpdatesAvatarSuccessfully()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "ACTIVE" };
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateAvatarRequestDto
        {
            File = null,
            AvatarUrl = "  https://example.com/direct-avatar.jpg  "
        };

        // Act
        var result = await _service.UpdateAvatarAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Avatar updated successfully.");
        result.Data!.AvatarUrl.Should().Be("https://example.com/direct-avatar.jpg");
        user.AvatarUrl.Should().Be("https://example.com/direct-avatar.jpg");

        _userRepoMock.Verify(r => r.Update(user), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    #endregion

    private static IFormFile CreateMockFormFile(string fileName, string contentType, long length)
    {
        var fileMock = new Mock<IFormFile>();
        var content = "fake content";
        var ms = new MemoryStream(Encoding.UTF8.GetBytes(content));

        fileMock.Setup(f => f.FileName).Returns(fileName);
        fileMock.Setup(f => f.ContentType).Returns(contentType);
        fileMock.Setup(f => f.Length).Returns(length);
        fileMock.Setup(f => f.OpenReadStream()).Returns(ms);

        return fileMock.Object;
    }
}
