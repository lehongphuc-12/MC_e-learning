using FluentAssertions;
using MC_BE.Core.Entities;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class GetMeAsyncTests : AuthServiceTestBase
{
    [Fact]
    public async Task GetMeAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Act
        var result = await Service.GetMeAsync(99);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
    }

    [Fact]
    public async Task GetMeAsync_WhenUserInactive_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User { UserId = 1, Status = "INACTIVE" });

        // Act
        var result = await Service.GetMeAsync(1);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User is not active.");
    }

    [Fact]
    public async Task GetMeAsync_WhenUserActive_ReturnsUserDto()
    {
        // Arrange
        Users.Add(new User
        {
            UserId = 1,
            FullName = "Active User",
            Email = "active@example.com",
            Status = "ACTIVE",
            Role = new Role { RoleName = "Instructor" },
            AvatarUrl = "http://avatar.com/1.png"
        });

        // Act
        var result = await Service.GetMeAsync(1);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("User details retrieved successfully.");
        result.Data!.FullName.Should().Be("Active User");
        result.Data.RoleName.Should().Be("Instructor");
        result.Data.AvatarUrl.Should().Be("http://avatar.com/1.png");
    }

    [Fact]
    public async Task GetMeAsync_WhenUserHasNoRole_DefaultsRoleNameToLearner()
    {
        // Arrange
        Users.Add(new User
        {
            UserId = 1,
            FullName = "No Role User",
            Email = "norole@example.com",
            Status = "ACTIVE",
            Role = null
        });

        // Act
        var result = await Service.GetMeAsync(1);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.RoleName.Should().Be("Learner");
    }
}
