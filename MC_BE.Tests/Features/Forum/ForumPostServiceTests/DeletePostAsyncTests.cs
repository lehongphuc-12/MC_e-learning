using System;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumPostServiceTests;

public class DeletePostAsyncTests : ForumPostServiceTestBase
{
    [Fact]
    public async Task DeletePostAsync_WhenDeletedByAuthor_SetsStatusDeletedAndReturnsTrue()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "PUBLISHED");

        // Act
        var result = await Service.DeletePostAsync(post.PostId, author.UserId, isAdmin: false);

        // Assert
        result.Should().BeTrue();
        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("DELETED");
    }

    [Fact]
    public async Task DeletePostAsync_WhenDeletedByAdmin_SetsStatusDeletedAndReturnsTrue()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var admin = CreateUser(20, "Admin User", "admin@example.com", roleName: "Admin");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "PUBLISHED");

        // Act
        var result = await Service.DeletePostAsync(post.PostId, admin.UserId, isAdmin: true);

        // Assert
        result.Should().BeTrue();
        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("DELETED");
    }

    [Fact]
    public async Task DeletePostAsync_WhenPostDoesNotExist_ReturnsFalse()
    {
        // Arrange (DB has no post with ID 999)

        // Act
        var result = await Service.DeletePostAsync(999, userId: 1, isAdmin: false);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeletePostAsync_WhenPostAlreadyDeleted_ReturnsFalse()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "DELETED");

        // Act
        var result = await Service.DeletePostAsync(post.PostId, author.UserId, isAdmin: false);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task DeletePostAsync_WhenNonAdminDeletesOtherUserPost_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var otherUser = CreateUser(20, "Other User", "other@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "PUBLISHED");

        // Act
        var act = () => Service.DeletePostAsync(post.PostId, otherUser.UserId, isAdmin: false);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền xóa bài viết của người khác.");

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("PUBLISHED");
    }

    [Fact]
    public async Task DeletePostAsync_WhenPostIsHidden_AuthorCanStillDeleteSuccessfully()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "HIDDEN");

        // Act
        var result = await Service.DeletePostAsync(post.PostId, author.UserId, isAdmin: false);

        // Assert
        result.Should().BeTrue();
        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("DELETED");
    }
}
