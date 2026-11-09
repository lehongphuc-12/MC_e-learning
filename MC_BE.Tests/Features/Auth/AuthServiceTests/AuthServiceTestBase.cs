using System.Linq.Expressions;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.Services;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Moq;

namespace MC_BE.Tests.Features.Auth.AuthServiceTests;

public abstract class AuthServiceTestBase
{
    protected readonly Mock<IGenericRepository<User>> UserRepoMock = new();
    protected readonly Mock<IGenericRepository<Role>> RoleRepoMock = new();
    protected readonly Mock<IGenericRepository<UserProfile>> UserProfileRepoMock = new();
    protected readonly Mock<IGenericRepository<PasswordResetToken>> ResetTokenRepoMock = new();
    protected readonly Mock<IGenericRepository<RefreshToken>> RefreshTokenRepoMock = new();
    protected readonly Mock<IUnitOfWork> UnitOfWorkMock = new();
    protected readonly Mock<IPasswordHasher> PasswordHasherMock = new();
    protected readonly Mock<ITokenService> TokenServiceMock = new();
    protected readonly Mock<ICloudinaryService> CloudinaryMock = new();
    protected readonly Mock<IEmailService> EmailServiceMock = new();
    protected readonly Mock<IConfiguration> ConfigMock = new();

    protected readonly List<User> Users = new();
    protected readonly List<Role> Roles = new();
    protected readonly List<UserProfile> UserProfiles = new();
    protected readonly List<RefreshToken> RefreshTokens = new();
    protected readonly List<PasswordResetToken> ResetTokens = new();

    protected readonly AuthService Service;

    protected AuthServiceTestBase()
    {
        // Default mock behaviors
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync((Expression<Func<User, bool>> pred, Expression<Func<User, object>>[] includes) =>
                Users.Where(pred.Compile()).ToList());

        UserRepoMock
            .Setup(r => r.AddAsync(It.IsAny<User>()))
            .Callback<User>(u =>
            {
                if (u.UserId == 0) u.UserId = Users.Count + 1;
                Users.Add(u);
            })
            .Returns(Task.CompletedTask);

        RoleRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Role, bool>>>(), It.IsAny<Expression<Func<Role, object>>[]>()))
            .ReturnsAsync((Expression<Func<Role, bool>> pred, Expression<Func<Role, object>>[] includes) =>
                Roles.Where(pred.Compile()).ToList());

        UserProfileRepoMock
            .Setup(r => r.AddAsync(It.IsAny<UserProfile>()))
            .Callback<UserProfile>(p => UserProfiles.Add(p))
            .Returns(Task.CompletedTask);

        RefreshTokenRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<RefreshToken, bool>>>(), It.IsAny<Expression<Func<RefreshToken, object>>[]>()))
            .ReturnsAsync((Expression<Func<RefreshToken, bool>> pred, Expression<Func<RefreshToken, object>>[] includes) =>
                RefreshTokens.Where(pred.Compile()).ToList());

        RefreshTokenRepoMock
            .Setup(r => r.AddAsync(It.IsAny<RefreshToken>()))
            .Callback<RefreshToken>(t => RefreshTokens.Add(t))
            .Returns(Task.CompletedTask);

        ResetTokenRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<PasswordResetToken, bool>>>(), It.IsAny<Expression<Func<PasswordResetToken, object>>[]>()))
            .ReturnsAsync((Expression<Func<PasswordResetToken, bool>> pred, Expression<Func<PasswordResetToken, object>>[] includes) =>
                ResetTokens.Where(pred.Compile()).ToList());

        ResetTokenRepoMock
            .Setup(r => r.AddAsync(It.IsAny<PasswordResetToken>()))
            .Callback<PasswordResetToken>(t => ResetTokens.Add(t))
            .Returns(Task.CompletedTask);

        PasswordHasherMock
            .Setup(p => p.HashPassword(It.IsAny<string>()))
            .Returns((string pw) => $"hashed_{pw}");

        PasswordHasherMock
            .Setup(p => p.VerifyPassword(It.IsAny<string>(), It.IsAny<string>()))
            .Returns((string pw, string hash) => hash == $"hashed_{pw}");

        TokenServiceMock
            .Setup(t => t.GenerateJwtToken(It.IsAny<User>()))
            .Returns(("mock_jwt_token", DateTime.UtcNow.AddMinutes(15)));

        TokenServiceMock
            .Setup(t => t.GenerateRefreshToken(It.IsAny<int>()))
            .Returns((int userId) => new RefreshToken
            {
                UserId = userId,
                Token = Guid.NewGuid().ToString("N"),
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            });

        ConfigMock.Setup(c => c["ClientUrl"]).Returns("http://localhost:5173");
        UnitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        Service = new AuthService(
            UserRepoMock.Object,
            RoleRepoMock.Object,
            UserProfileRepoMock.Object,
            ResetTokenRepoMock.Object,
            RefreshTokenRepoMock.Object,
            UnitOfWorkMock.Object,
            PasswordHasherMock.Object,
            TokenServiceMock.Object,
            CloudinaryMock.Object,
            EmailServiceMock.Object,
            ConfigMock.Object
        );
    }
}
