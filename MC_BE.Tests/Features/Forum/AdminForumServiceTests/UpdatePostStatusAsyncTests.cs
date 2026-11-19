using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class UpdatePostStatusAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task UpdatePostStatusAsync_WhenPostExists_UpdatesStatusSuccessfully()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId, status: "PUBLISHED");

        // Act
        var result = await Service.UpdatePostStatusAsync(post.PostId, admin.UserId, "HIDDEN_BY_ADMIN");

        // Assert
        result.Should().BeTrue();
        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("HIDDEN_BY_ADMIN");
    }

    [Fact]
    public async Task UpdatePostStatusAsync_WhenPostNotFound_ReturnsFalse()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");

        // Act
        var result = await Service.UpdatePostStatusAsync(999, admin.UserId, "DELETED");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task UpdatePostStatusAsync_WhenStatusHasMixedCase_NormalizesToUpperCase()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId, status: "PUBLISHED");

        // Act
        var result = await Service.UpdatePostStatusAsync(post.PostId, admin.UserId, "deleted");

        // Assert
        result.Should().BeTrue();
        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("DELETED");
    }
}
