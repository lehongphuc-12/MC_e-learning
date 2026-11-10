using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Auth.DTOs;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public class RegisterAsyncTests : AuthServiceTestBase
{
    [Fact]
    public async Task RegisterAsync_WhenEmailAlreadyExists_ReturnsFailure()
    {
        // Arrange
        Users.Add(new User { Email = "test@example.com", Status = "ACTIVE" });
        var request = new RegisterRequest
        {
            FullName = "New User",
            Email = "test@example.com",
            Password = "Password123!"
        };

        // Act
        var result = await Service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Email is already registered.");
    }

    [Fact]
    public async Task RegisterAsync_WhenEmailHasLeadingTrailingSpacesAndUppercase_NormalizesEmailAndFailsIfDuplicate()
    {
        // Arrange
        Users.Add(new User { Email = "learner@example.com", Status = "ACTIVE" });
        var request = new RegisterRequest
        {
            FullName = "New User",
            Email = "  LEARNER@EXAMPLE.COM  ",
            Password = "Password123!"
        };

        // Act
        var result = await Service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Email is already registered.");
    }

    [Fact]
    public async Task RegisterAsync_WhenDefaultRoleNotFound_ReturnsFailure()
    {
        // Arrange (Roles is empty)
        var request = new RegisterRequest
        {
            FullName = "New User",
            Email = "new@example.com",
            Password = "Password123!"
        };

        // Act
        var result = await Service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("System error: Default role 'Learner' could not be found.");
    }

    [Fact]
    public async Task RegisterAsync_WhenDefaultRoleFoundByName_RegistersSuccessfully()
    {
        // Arrange
        var learnerRole = new Role { RoleId = 1, RoleName = "Learner" };
        Roles.Add(learnerRole);

        var request = new RegisterRequest
        {
            FullName = "John Learner",
            Email = "learner@example.com",
            Password = "Password123!",
            PhoneNumber = "0987654321"
        };

        // Act
        var result = await Service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Registration successful.");
        result.Data.Should().NotBeNull();
        result.Data!.FullName.Should().Be("John Learner");
        result.Data.Email.Should().Be("learner@example.com");
        result.Data.RoleName.Should().Be("Learner");

        Users.Should().ContainSingle(u => u.Email == "learner@example.com");
        var savedUser = Users.First(u => u.Email == "learner@example.com");
        savedUser.PasswordHash.Should().Be("hashed_Password123!");
        savedUser.RoleId.Should().Be(1);
        savedUser.Status.Should().Be("ACTIVE");

        UserProfiles.Should().ContainSingle(p => p.User == savedUser && p.PreferredLanguage == "en");
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_WhenRoleNotFoundByName_FallsBackToLearnerRoleId()
    {
        // Arrange (RoleName is not "Learner", but RoleId == 1 which is UserRole.Learner)
        var role = new Role { RoleId = (int)UserRole.Learner, RoleName = "StudentRole" };
        Roles.Add(role);

        var request = new RegisterRequest
        {
            FullName = "Fallback User",
            Email = "fallback@example.com",
            Password = "Password123!"
        };

        // Act
        var result = await Service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.RoleName.Should().Be("StudentRole");
    }
}
