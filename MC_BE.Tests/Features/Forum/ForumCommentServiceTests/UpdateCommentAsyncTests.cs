using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumCommentServiceTests;

public class UpdateCommentAsyncTests : ForumCommentServiceTestBase
{
    [Fact]
    public async Task UpdateCommentAsync_WhenValidRequestByAuthor_UpdatesCommentAndReturnsDto()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);
        var comment = CreateComment(100, post.PostId, user.UserId, content: "Old Content");

        var request = new UpdateCommentRequest
        {
            Content = "Updated Content",
            ImageUrl = "https://example.com/updated.png",
            IsAnonymous = false
        };

        // Act
        var result = await Service.UpdateCommentAsync(comment.CommentId, user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Content.Should().Be("Updated Content");
        result.ImageUrl.Should().Be("https://example.com/updated.png");
        result.IsAuthor.Should().BeTrue();

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Content.Should().Be("Updated Content");
        dbComment.ImageUrl.Should().Be("https://example.com/updated.png");
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenCommentDoesNotExist_ReturnsNull()
    {
        // Arrange
        var user = CreateUser(1, "John Doe", "john@example.com");
        var request = new UpdateCommentRequest { Content = "Updated" };

        // Act
        var result = await Service.UpdateCommentAsync(999, user.UserId, request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenCommentIsDeleted_ReturnsNull()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);
        var comment = CreateComment(100, post.PostId, user.UserId, status: "DELETED");

        var request = new UpdateCommentRequest { Content = "Updated" };

        // Act
        var result = await Service.UpdateCommentAsync(comment.CommentId, user.UserId, request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenUserIsNotAuthor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var otherUser = CreateUser(2, "Other", "other@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId);

        var request = new UpdateCommentRequest { Content = "Malicious update" };

        // Act
        var act = () => Service.UpdateCommentAsync(comment.CommentId, otherUser.UserId, request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền chỉnh sửa bình luận của người khác.");
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenCommentIsNotActive_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId, status: "HIDDEN");

        var request = new UpdateCommentRequest { Content = "Update on hidden comment" };

        // Act
        var act = () => Service.UpdateCommentAsync(comment.CommentId, author.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bình luận đang trong trạng thái bị ẩn, không thể chỉnh sửa.");
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenContentHasLeadingTrailingSpaces_TrimsContent()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);
        var comment = CreateComment(100, post.PostId, user.UserId);

        var request = new UpdateCommentRequest
        {
            Content = "   Spaces around content   ",
            ImageUrl = "   https://example.com/trimmed.png   "
        };

        // Act
        var result = await Service.UpdateCommentAsync(comment.CommentId, user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Content.Should().Be("Spaces around content");
        result.ImageUrl.Should().Be("https://example.com/trimmed.png");

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Content.Should().Be("Spaces around content");
        dbComment.ImageUrl.Should().Be("https://example.com/trimmed.png");
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenImageUrlIsNull_UpdatesSuccessfullyWithNullImage()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);
        var comment = CreateComment(100, post.PostId, user.UserId, imageUrl: "https://example.com/old.png");

        var request = new UpdateCommentRequest
        {
            Content = "Content without image",
            ImageUrl = null
        };

        // Act
        var result = await Service.UpdateCommentAsync(comment.CommentId, user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result!.ImageUrl.Should().BeNull();

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.ImageUrl.Should().BeNull();
    }

    [Fact]
    public async Task UpdateCommentAsync_WhenUpdatedToAnonymous_MasksAuthorInResult()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);
        var comment = CreateComment(100, post.PostId, user.UserId, isAnonymous: false);

        var request = new UpdateCommentRequest
        {
            Content = "Now anonymous",
            IsAnonymous = true
        };

        // Act
        var result = await Service.UpdateCommentAsync(comment.CommentId, user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result!.IsAnonymous.Should().BeTrue();
        result.AuthorName.Should().Be("Học viên ẩn danh");
        result.AuthorId.Should().Be(0);

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.IsAnonymous.Should().BeTrue();
    }
}
