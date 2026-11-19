using System;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumCommentServiceTests;

public class DeleteCommentAsyncTests : ForumCommentServiceTestBase
{
    [Fact]
    public async Task DeleteCommentAsync_WhenDeletedByAuthor_SetsStatusDeletedAndDecrementsPostCommentsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId, commentsCount: 5);
        var comment = CreateComment(100, post.PostId, user.UserId, status: "ACTIVE");

        // Act
        var result = await Service.DeleteCommentAsync(comment.CommentId, user.UserId, isAdmin: false);

        // Assert
        result.Should().BeTrue();

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("DELETED");

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.CommentsCount.Should().Be(4);
    }

    [Fact]
    public async Task DeleteCommentAsync_WhenDeletedByAdmin_SetsStatusDeletedAndDecrementsPostCommentsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var admin = CreateUser(2, "Admin User", "admin@example.com", roleName: "Admin");
        var post = CreatePost(10, topic.TopicId, author.UserId, commentsCount: 2);
        var comment = CreateComment(100, post.PostId, author.UserId, status: "ACTIVE");

        // Act
        var result = await Service.DeleteCommentAsync(comment.CommentId, admin.UserId, isAdmin: true);

        // Assert
        result.Should().BeTrue();

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("DELETED");

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.CommentsCount.Should().Be(1);
    }

    [Fact]
    public async Task DeleteCommentAsync_WhenCommentDoesNotExist_ReturnsFalse()
    {
        // Arrange
        var user = CreateUser(1, "John Doe", "john@example.com");

        // Act
        var result = await Service.DeleteCommentAsync(999, user.UserId, isAdmin: false);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteCommentAsync_WhenCommentAlreadyDeleted_ReturnsFalse()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);
        var comment = CreateComment(100, post.PostId, user.UserId, status: "DELETED");

        // Act
        var result = await Service.DeleteCommentAsync(comment.CommentId, user.UserId, isAdmin: false);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeleteCommentAsync_WhenNonAdminDeletesOtherUserComment_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var otherUser = CreateUser(2, "Other", "other@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId, status: "ACTIVE");

        // Act
        var act = () => Service.DeleteCommentAsync(comment.CommentId, otherUser.UserId, isAdmin: false);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền xóa bình luận của người khác.");

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("ACTIVE");
    }

    [Fact]
    public async Task DeleteCommentAsync_WhenPostCommentsCountIsZero_DoesNotDecrementBelowZero()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId, commentsCount: 0);
        var comment = CreateComment(100, post.PostId, user.UserId, status: "ACTIVE");

        // Act
        var result = await Service.DeleteCommentAsync(comment.CommentId, user.UserId, isAdmin: false);

        // Assert
        result.Should().BeTrue();

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.CommentsCount.Should().Be(0);
    }
}
