using System.Linq.Expressions;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.DTOs.auth;
using Moq;
using Xunit;
using EntityRole = MC_BE.Core.Entities.Role;

namespace MC_BE.Tests.Features.Auth.UserProfileServiceTests;

public class GetProfileAsyncTests : UserProfileServiceTestBase
{
    [Fact]
    public async Task GetProfileAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User>());

        var request = new GetProfileRequestDto { UserId = 99 };

        // Act
        var result = await Service.GetProfileAsync(request, currentUserId: 1);

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

        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new GetProfileRequestDto { UserId = 1 };

        // Act
        var result = await Service.GetProfileAsync(request, currentUserId: 1);

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

        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new GetProfileRequestDto { UserId = null }; // tests fallback to currentUserId

        // Act
        var result = await Service.GetProfileAsync(request, currentUserId: 1);

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

    [Fact]
    public async Task GetProfileAsync_WhenUserProfileIsNull_ReturnsUserProfileDtoWithDefaults()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            FullName = "Jane Profileless",
            Email = "jane@example.com",
            PhoneNumber = "0123456789",
            AvatarUrl = "http://avatar.url/img.png",
            Status = "ACTIVE",
            Role = null,
            UserProfile = null
        };

        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new GetProfileRequestDto { UserId = 1 };

        // Act
        var result = await Service.GetProfileAsync(request, currentUserId: 1);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.UserId.Should().Be(1);
        result.Data.RoleName.Should().Be("Learner");
        result.Data.Bio.Should().BeNull();
        result.Data.PreferredLanguage.Should().Be("en");
    }

    [Fact]
    public async Task GetProfileAsync_WhenRequestIsNull_FallsBackToCurrentUserId()
    {
        // Arrange
        var user = new User
        {
            UserId = 5,
            FullName = "Null Request User",
            Status = "ACTIVE"
        };

        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        // Act
        var result = await Service.GetProfileAsync(null, currentUserId: 5);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.UserId.Should().Be(5);
        result.Data.FullName.Should().Be("Null Request User");
    }
}
