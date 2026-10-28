using System.Linq.Expressions;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Auth.DTOs;
using MC_BE.Features.Auth.DTOs.auth;
using MC_BE.Features.Auth.Services;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Auth;

public class AuthServiceTests
{
    private readonly Mock<IGenericRepository<User>> _userRepoMock;
    private readonly Mock<IGenericRepository<Role>> _roleRepoMock;
    private readonly Mock<IGenericRepository<UserProfile>> _userProfileRepoMock;
    private readonly Mock<IGenericRepository<PasswordResetToken>> _resetTokenRepoMock;
    private readonly Mock<IGenericRepository<RefreshToken>> _refreshTokenRepoMock;
    private readonly Mock<IUnitOfWork> _unitOfWorkMock;
    private readonly Mock<IPasswordHasher> _passwordHasherMock;
    private readonly Mock<ITokenService> _tokenServiceMock;
    private readonly Mock<ICloudinaryService> _cloudinaryMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<IConfiguration> _configMock;

    private readonly List<User> _users = new();
    private readonly List<Role> _roles = new();
    private readonly List<UserProfile> _userProfiles = new();
    private readonly List<RefreshToken> _refreshTokens = new();
    private readonly List<PasswordResetToken> _resetTokens = new();

    private readonly AuthService _service;

    public AuthServiceTests()
    {
        _userRepoMock = new Mock<IGenericRepository<User>>();
        _roleRepoMock = new Mock<IGenericRepository<Role>>();
        _userProfileRepoMock = new Mock<IGenericRepository<UserProfile>>();
        _resetTokenRepoMock = new Mock<IGenericRepository<PasswordResetToken>>();
        _refreshTokenRepoMock = new Mock<IGenericRepository<RefreshToken>>();
        _unitOfWorkMock = new Mock<IUnitOfWork>();
        _passwordHasherMock = new Mock<IPasswordHasher>();
        _tokenServiceMock = new Mock<ITokenService>();
        _cloudinaryMock = new Mock<ICloudinaryService>();
        _emailServiceMock = new Mock<IEmailService>();
        _configMock = new Mock<IConfiguration>();

        // Default mock behaviors
        _userRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync((Expression<Func<User, bool>> pred, Expression<Func<User, object>>[] includes) =>
                _users.Where(pred.Compile()).ToList());

        _userRepoMock
            .Setup(r => r.AddAsync(It.IsAny<User>()))
            .Callback<User>(u =>
            {
                if (u.UserId == 0) u.UserId = _users.Count + 1;
                _users.Add(u);
            })
            .Returns(Task.CompletedTask);

        _roleRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Role, bool>>>(), It.IsAny<Expression<Func<Role, object>>[]>()))
            .ReturnsAsync((Expression<Func<Role, bool>> pred, Expression<Func<Role, object>>[] includes) =>
                _roles.Where(pred.Compile()).ToList());

        _userProfileRepoMock
            .Setup(r => r.AddAsync(It.IsAny<UserProfile>()))
            .Callback<UserProfile>(p => _userProfiles.Add(p))
            .Returns(Task.CompletedTask);

        _refreshTokenRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<RefreshToken, bool>>>(), It.IsAny<Expression<Func<RefreshToken, object>>[]>()))
            .ReturnsAsync((Expression<Func<RefreshToken, bool>> pred, Expression<Func<RefreshToken, object>>[] includes) =>
                _refreshTokens.Where(pred.Compile()).ToList());

        _refreshTokenRepoMock
            .Setup(r => r.AddAsync(It.IsAny<RefreshToken>()))
            .Callback<RefreshToken>(t => _refreshTokens.Add(t))
            .Returns(Task.CompletedTask);

        _resetTokenRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<PasswordResetToken, bool>>>(), It.IsAny<Expression<Func<PasswordResetToken, object>>[]>()))
            .ReturnsAsync((Expression<Func<PasswordResetToken, bool>> pred, Expression<Func<PasswordResetToken, object>>[] includes) =>
                _resetTokens.Where(pred.Compile()).ToList());

        _resetTokenRepoMock
            .Setup(r => r.AddAsync(It.IsAny<PasswordResetToken>()))
            .Callback<PasswordResetToken>(t => _resetTokens.Add(t))
            .Returns(Task.CompletedTask);

        _passwordHasherMock
            .Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns((string pw) => $"hashed_{pw}");

        _passwordHasherMock
            .Setup(p => p.VerifyPassword(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string pw, string hash) => hash == $"hashed_{pw}");

        _tokenServiceMock
            .Setup(t => t.GenerateJwtToken(It.IsAny<User>()))
            .Returns(("mock_jwt_token", DateTime.UtcNow.AddMinutes(15)));

        _tokenServiceMock
            .Setup(t => t.GenerateRefreshToken(It.IsAny<int>()))
            .Returns((int userId) => new RefreshToken
            {
                UserId = userId,
                Token = Guid.NewGuid().ToString("N"),
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            });

        _configMock.Setup(c => c["ClientUrl"]).Returns("http://localhost:5173");
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        _service = new AuthService(
            _userRepoMock.Object,
            _roleRepoMock.Object,
            _userProfileRepoMock.Object,
            _resetTokenRepoMock.Object,
            _refreshTokenRepoMock.Object,
            _unitOfWorkMock.Object,
            _passwordHasherMock.Object,
            _tokenServiceMock.Object,
            _cloudinaryMock.Object,
            _emailServiceMock.Object,
            _configMock.Object
        );
    }

    #region GoogleLoginAsync Tests

    [Fact]
    public async Task GoogleLoginAsync_WhenIdTokenIsEmpty_ReturnsFailure()
    {
        // Arrange
        var request = new GoogleLoginRequest { IdToken = "" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.GoogleLoginAsync(request, httpContext.Response);

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
        var result = await _service.GoogleLoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().StartWith("Invalid Google token:");
    }

    #endregion

    #region RegisterAsync Tests

    [Fact]
    public async Task RegisterAsync_WhenEmailAlreadyExists_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User { Email = "test@example.com", Status = "ACTIVE" });
        var request = new RegisterRequest
        {
            FullName = "New User",
            Email = "test@example.com",
            Password = "Password123!"
        };

        // Act
        var result = await _service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Email is already registered.");
    }

    [Fact]
    public async Task RegisterAsync_WhenDefaultRoleNotFound_ReturnsFailure()
    {
        // Arrange (_roles is empty)
        var request = new RegisterRequest
        {
            FullName = "New User",
            Email = "new@example.com",
            Password = "Password123!"
        };

        // Act
        var result = await _service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("System error: Default role 'Learner' could not be found.");
    }

    [Fact]
    public async Task RegisterAsync_WhenDefaultRoleFoundByName_RegistersSuccessfully()
    {
        // Arrange
        var learnerRole = new Role { RoleId = 1, RoleName = "Learner" };
        _roles.Add(learnerRole);

        var request = new RegisterRequest
        {
            FullName = "John Learner",
            Email = "learner@example.com",
            Password = "Password123!",
            PhoneNumber = "0987654321"
        };

        // Act
        var result = await _service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Registration successful.");
        result.Data.Should().NotBeNull();
        result.Data!.FullName.Should().Be("John Learner");
        result.Data.Email.Should().Be("learner@example.com");
        result.Data.RoleName.Should().Be("Learner");

        _users.Should().ContainSingle(u => u.Email == "learner@example.com");
        var savedUser = _users.First(u => u.Email == "learner@example.com");
        savedUser.PasswordHash.Should().Be("hashed_Password123!");
        savedUser.RoleId.Should().Be(1);
        savedUser.Status.Should().Be("ACTIVE");

        _userProfiles.Should().ContainSingle(p => p.User == savedUser && p.PreferredLanguage == "en");
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task RegisterAsync_WhenRoleNotFoundByName_FallsBackToLearnerRoleId()
    {
        // Arrange (RoleName is not "Learner", but RoleId == 1 which is UserRole.Learner)
        var role = new Role { RoleId = (int)UserRole.Learner, RoleName = "StudentRole" };
        _roles.Add(role);

        var request = new RegisterRequest
        {
            FullName = "Fallback User",
            Email = "fallback@example.com",
            Password = "Password123!"
        };

        // Act
        var result = await _service.RegisterAsync(request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.RoleName.Should().Be("StudentRole");
    }

    #endregion

    #region LoginAsync Tests

    [Fact]
    public async Task LoginAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        var request = new LoginRequest { Email = "notfound@example.com", Password = "Pass" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid email or password.");
    }

    [Fact]
    public async Task LoginAsync_WhenUserIsInactive_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User
        {
            Email = "inactive@example.com",
            PasswordHash = "hashed_Pass123",
            Status = "INACTIVE"
        });

        var request = new LoginRequest { Email = "inactive@example.com", Password = "Pass123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("This account has been deactivated.");
    }

    [Fact]
    public async Task LoginAsync_WhenGoogleAccountOrPasswordHashEmpty_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User
        {
            Email = "google@example.com",
            IsGoogleLogin = true,
            PasswordHash = null,
            Status = "ACTIVE"
        });

        var request = new LoginRequest { Email = "google@example.com", Password = "Pass123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.");
    }

    [Fact]
    public async Task LoginAsync_WhenPasswordIsIncorrect_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User
        {
            Email = "user@example.com",
            PasswordHash = "hashed_CorrectPassword",
            Status = "ACTIVE"
        });

        var request = new LoginRequest { Email = "user@example.com", Password = "WrongPassword" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.LoginAsync(request, httpContext.Response);

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
        _users.Add(user);

        var request = new LoginRequest { Email = "jane@example.com", Password = "Password123" };
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.LoginAsync(request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Login successful.");
        result.Data.Should().NotBeNull();
        result.Data!.Token.Should().Be("mock_jwt_token");
        result.Data.User.FullName.Should().Be("Jane Doe");
        result.Data.User.RoleName.Should().Be("Learner");

        user.LastLoginAt.Should().NotBeNull();
        _refreshTokens.Should().ContainSingle(t => t.UserId == 1);
        _tokenServiceMock.Verify(t => t.SetRefreshTokenCookie(httpContext.Response, It.IsAny<string>(), It.IsAny<DateTime>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    #endregion

    #region RefreshTokenAsync Tests

    [Fact]
    public async Task RefreshTokenAsync_WhenNoTokenProvided_ReturnsFailure()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.RefreshTokenAsync(null, httpContext.Request, httpContext.Response);

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
        var result = await _service.RefreshTokenAsync(null, httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid or expired refresh token.");
        _tokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
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
        _refreshTokens.Add(expiredToken);

        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.RefreshTokenAsync("expired_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid or expired refresh token.");
        _tokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
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
        _refreshTokens.Add(activeToken);

        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.RefreshTokenAsync("valid_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User account is inactive.");
        _tokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
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
        _refreshTokens.Add(activeToken);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.Append("Cookie", "refreshToken=valid_token");

        // Act
        var result = await _service.RefreshTokenAsync(null, httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("Token refreshed successfully.");
        result.Data!.AccessToken.Should().Be("mock_jwt_token");

        activeToken.IsRevoked.Should().BeTrue();
        activeToken.ReplacedByToken.Should().NotBeNullOrEmpty();
        _refreshTokens.Should().HaveCount(2); // Old revoked + new active
        _tokenServiceMock.Verify(t => t.SetRefreshTokenCookie(httpContext.Response, It.IsAny<string>(), It.IsAny<DateTime>()), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    #endregion

    #region LogoutAsync Tests

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
        _refreshTokens.Add(tokenEntity);

        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.LogoutAsync("active_logout_token", httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Logged out successfully.");
        tokenEntity.IsRevoked.Should().BeTrue();
        _tokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_WhenTokenEmptyOrNotFound_StillClearsCookie()
    {
        // Arrange
        var httpContext = new DefaultHttpContext();

        // Act
        var result = await _service.LogoutAsync(null, httpContext.Request, httpContext.Response);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Logged out successfully.");
        _tokenServiceMock.Verify(t => t.ClearRefreshTokenCookie(httpContext.Response), Times.Once);
    }

    #endregion

    #region GetMeAsync Tests

    [Fact]
    public async Task GetMeAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Act
        var result = await _service.GetMeAsync(99);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
    }

    [Fact]
    public async Task GetMeAsync_WhenUserInactive_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User { UserId = 1, Status = "INACTIVE" });

        // Act
        var result = await _service.GetMeAsync(1);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User is not active.");
    }

    [Fact]
    public async Task GetMeAsync_WhenUserActive_ReturnsUserDto()
    {
        // Arrange
        _users.Add(new User
        {
            UserId = 1,
            FullName = "Active User",
            Email = "active@example.com",
            Status = "ACTIVE",
            Role = new Role { RoleName = "Instructor" },
            AvatarUrl = "http://avatar.com/1.png"
        });

        // Act
        var result = await _service.GetMeAsync(1);

        // Assert
        result.Success.Should().BeTrue();
        result.Message.Should().Be("User details retrieved successfully.");
        result.Data!.FullName.Should().Be("Active User");
        result.Data.RoleName.Should().Be("Instructor");
        result.Data.AvatarUrl.Should().Be("http://avatar.com/1.png");
    }

    #endregion

    #region ForgotPasswordAsync Tests

    [Fact]
    public async Task ForgotPasswordAsync_WhenEmailIsEmpty_ReturnsFailure()
    {
        // Act
        var result = await _service.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "   " });

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Email is required.");
    }

    [Fact]
    public async Task ForgotPasswordAsync_WhenUserNotFound_ReturnsSuccessWithoutSendingEmail()
    {
        // Act
        var result = await _service.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "unknown@example.com" });

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Contain("If an account exists for this email");
        _emailServiceMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task ForgotPasswordAsync_WhenUserFound_SavesTokenAndSendsEmail()
    {
        // Arrange
        _users.Add(new User
        {
            UserId = 1,
            FullName = "Forgot User",
            Email = "forgot@example.com",
            Status = "ACTIVE"
        });

        // Act
        var result = await _service.ForgotPasswordAsync(new ForgotPasswordRequestDto { Email = "forgot@example.com" });

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Contain("If an account exists for this email");
        _resetTokens.Should().ContainSingle(t => t.UserId == 1 && !t.IsUsed);
        _emailServiceMock.Verify(e => e.SendEmailAsync("forgot@example.com", It.IsAny<string>(), It.IsAny<string>(), true), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    #endregion

    #region ResetPasswordAsync Tests

    [Theory]
    [InlineData("", "user@example.com", "NewPass")]
    [InlineData("token", "", "NewPass")]
    [InlineData("token", "user@example.com", "")]
    public async Task ResetPasswordAsync_WhenRequiredFieldsEmpty_ReturnsFailure(string token, string email, string newPass)
    {
        // Arrange
        var request = new ResetPasswordRequestDto { Token = token, Email = email, NewPassword = newPass };

        // Act
        var result = await _service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Token, Email, and New Password are required.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        var request = new ResetPasswordRequestDto { Token = "token123", Email = "notfound@example.com", NewPassword = "NewPassword123" };

        // Act
        var result = await _service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid password reset request.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenTokenNotFound_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User { UserId = 1, Email = "user@example.com" });
        var request = new ResetPasswordRequestDto { Token = "wrong_token", Email = "user@example.com", NewPassword = "NewPassword123" };

        // Act
        var result = await _service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Invalid or expired password reset token.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenTokenIsAlreadyUsed_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User { UserId = 1, Email = "user@example.com" });
        _resetTokens.Add(new PasswordResetToken
        {
            UserId = 1,
            Token = "used_token",
            IsUsed = true,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        });

        var request = new ResetPasswordRequestDto { Token = "used_token", Email = "user@example.com", NewPassword = "NewPassword123" };

        // Act
        var result = await _service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("This password reset link has already been used. Please request a new link.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenTokenIsExpired_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User { UserId = 1, Email = "user@example.com" });
        _resetTokens.Add(new PasswordResetToken
        {
            UserId = 1,
            Token = "expired_token",
            IsUsed = false,
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5)
        });

        var request = new ResetPasswordRequestDto { Token = "expired_token", Email = "user@example.com", NewPassword = "NewPassword123" };

        // Act
        var result = await _service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("This password reset link has expired. Please request a new link.");
    }

    [Fact]
    public async Task ResetPasswordAsync_WhenTokenValid_UpdatesPasswordAndMarksTokenUsed()
    {
        // Arrange
        var user = new User { UserId = 1, Email = "user@example.com", PasswordHash = "old_hash" };
        _users.Add(user);

        var tokenEntity = new PasswordResetToken
        {
            UserId = 1,
            Token = "valid_token",
            IsUsed = false,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };
        _resetTokens.Add(tokenEntity);

        var request = new ResetPasswordRequestDto { Token = "valid_token", Email = "user@example.com", NewPassword = "BrandNewPassword123" };

        // Act
        var result = await _service.ResetPasswordAsync(request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Contain("Your password has been reset successfully");
        user.PasswordHash.Should().Be("hashed_BrandNewPassword123");
        tokenEntity.IsUsed.Should().BeTrue();
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    #endregion

    #region ChangePasswordAsync Tests

    [Fact]
    public async Task ChangePasswordAsync_WhenUserNotFound_ReturnsFailure()
    {
        // Act
        var result = await _service.ChangePasswordAsync(99, new ChangePasswordRequestDto());

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found.");
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenUserInactive_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User { UserId = 1, Status = "INACTIVE" });

        // Act
        var result = await _service.ChangePasswordAsync(1, new ChangePasswordRequestDto());

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User account is inactive.");
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenStandardUserAndOldPasswordEmpty_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = "hashed_OldPass",
            IsGoogleLogin = false
        });

        var request = new ChangePasswordRequestDto { OldPassword = "", NewPassword = "NewPass" };

        // Act
        var result = await _service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Old password is required.");
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenStandardUserAndOldPasswordIncorrect_ReturnsFailure()
    {
        // Arrange
        _users.Add(new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = "hashed_CorrectOldPass",
            IsGoogleLogin = false
        });

        var request = new ChangePasswordRequestDto { OldPassword = "WrongOldPass", NewPassword = "NewPass" };

        // Act
        var result = await _service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Incorrect old password.");
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenStandardUserAndOldPasswordCorrect_UpdatesPasswordSuccessfully()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = "hashed_CorrectOldPass",
            IsGoogleLogin = false
        };
        _users.Add(user);

        var request = new ChangePasswordRequestDto { OldPassword = "CorrectOldPass", NewPassword = "BrandNewPassword123" };

        // Act
        var result = await _service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Password changed successfully.");
        user.PasswordHash.Should().Be("hashed_BrandNewPassword123");
        user.IsGoogleLogin.Should().BeFalse();
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task ChangePasswordAsync_WhenGoogleUser_ChangesPasswordWithoutOldPassword()
    {
        // Arrange
        var user = new User
        {
            UserId = 1,
            Status = "ACTIVE",
            PasswordHash = null,
            IsGoogleLogin = true
        };
        _users.Add(user);

        var request = new ChangePasswordRequestDto { OldPassword = null, NewPassword = "FirstTimePassword123" };

        // Act
        var result = await _service.ChangePasswordAsync(1, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().Be("Password changed successfully.");
        user.PasswordHash.Should().Be("hashed_FirstTimePassword123");
        user.IsGoogleLogin.Should().BeFalse(); // Google user converted to standard credentials
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    #endregion
}
