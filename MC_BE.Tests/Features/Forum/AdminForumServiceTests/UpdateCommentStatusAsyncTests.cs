using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class UpdateCommentStatusAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task UpdateCommentStatusAsync_WhenCommentExists_UpdatesStatusSuccessfully()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(20, post.PostId, author.UserId, status: "ACTIVE");

        // Act
        var result = await Service.UpdateCommentStatusAsync(comment.CommentId, admin.UserId, "HIDDEN_BY_ADMIN");

        // Assert
        result.Should().BeTrue();
        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("HIDDEN_BY_ADMIN");
    }

    [Fact]
    public async Task UpdateCommentStatusAsync_WhenCommentNotFound_ReturnsFalse()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");

        // Act
        var result = await Service.UpdateCommentStatusAsync(999, admin.UserId, "DELETED");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateCommentStatusAsync_WhenStatusHasMixedCase_NormalizesToUpperCase()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(20, post.PostId, author.UserId, status: "ACTIVE");

        // Act
        var result = await Service.UpdateCommentStatusAsync(comment.CommentId, admin.UserId, "deleted");

        // Assert
        result.Should().BeTrue();
        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("DELETED");
    }
}
