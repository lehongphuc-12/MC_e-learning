using System.Linq.Expressions;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.DTOs.auth;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.UserProfileServiceTests;

public class UpdateProfileAsyncTests : UserProfileServiceTestBase
{
    [Fact]
    public async Task UpdateProfileAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User>());

        var request = new UpdateProfileRequestDto { FullName = "Updated Name" };

        // Act
        var result = await Service.UpdateProfileAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenUserInactive_ReturnsFailure()
    {
        // Arrange
        var user = new User { UserId = 1, Status = "SUSPENDED" };
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateProfileRequestDto { FullName = "Updated Name" };

        // Act
        var result = await Service.UpdateProfileAsync(1, request);

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

        UserRepoMock
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
        var result = await Service.UpdateProfileAsync(1, request);

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

        UserProfileRepoMock.Verify(r => r.AddAsync(It.Is<UserProfile>(p => p.UserId == 1)), Times.Once);
        UserRepoMock.Verify(r => r.Update(user), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
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

        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateProfileRequestDto
        {
            Bio = "Updated Bio",
            LearningGoal = "Master C#"
        };

        // Act
        var result = await Service.UpdateProfileAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Bio.Should().Be("Updated Bio");
        result.Data.LearningGoal.Should().Be("Master C#");
        result.Data.Gender.Should().Be("Male"); // Unchanged

        UserProfileRepoMock.Verify(r => r.AddAsync(It.IsAny<UserProfile>()), Times.Never);
        UserRepoMock.Verify(r => r.Update(user), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateProfileAsync_WhenRequestFieldsAreNull_DoesNotOverwriteExistingUserFields()
    {
        // Arrange
        var existingProfile = new UserProfile
        {
            UserId = 1,
            Bio = "Original Bio",
            Gender = "Female",
            DateOfBirth = new DateOnly(1995, 1, 1),
            ExperienceLevel = "Advanced",
            LearningGoal = "Learn DevOps",
            PreferredLanguage = "vi"
        };
        var user = new User
        {
            UserId = 1,
            FullName = "Original Name",
            PhoneNumber = "0900000000",
            Status = "ACTIVE",
            UserProfile = existingProfile
        };

        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync(new List<User> { user });

        var request = new UpdateProfileRequestDto
        {
            FullName = null,
            PhoneNumber = null,
            Bio = null,
            Gender = null,
            DateOfBirth = null,
            ExperienceLevel = null,
            LearningGoal = null,
            PreferredLanguage = null
        };

        // Act
        var result = await Service.UpdateProfileAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.FullName.Should().Be("Original Name");
        result.Data.PhoneNumber.Should().Be("0900000000");
        result.Data.Bio.Should().Be("Original Bio");
        result.Data.Gender.Should().Be("Female");
        result.Data.DateOfBirth.Should().Be(new DateOnly(1995, 1, 1));
        result.Data.ExperienceLevel.Should().Be("Advanced");
        result.Data.LearningGoal.Should().Be("Learn DevOps");
        result.Data.PreferredLanguage.Should().Be("vi");
    }
}
