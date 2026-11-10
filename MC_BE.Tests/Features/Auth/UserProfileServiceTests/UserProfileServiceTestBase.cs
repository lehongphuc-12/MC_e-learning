using System.Text;
using MC_BE.Core.Entities;
using MC_BE.Features.Auth.Services;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Moq;

namespace MC_BE.Tests.Features.Auth.UserProfileServiceTests;

public abstract class UserProfileServiceTestBase
{
    protected readonly Mock<IGenericRepository<User>> UserRepoMock = new();
    protected readonly Mock<IGenericRepository<UserProfile>> UserProfileRepoMock = new();
    protected readonly Mock<IUnitOfWork> UnitOfWorkMock = new();
    protected readonly Mock<ICloudinaryService> CloudinaryMock = new();
    protected readonly UserProfileService Service;

    protected UserProfileServiceTestBase()
    {
        Service = new UserProfileService(
            UserRepoMock.Object,
            UserProfileRepoMock.Object,
            UnitOfWorkMock.Object,
            CloudinaryMock.Object
        );
    }

    protected static IFormFile CreateMockFormFile(string fileName, string contentType, long length)
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
