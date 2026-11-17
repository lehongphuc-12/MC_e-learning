using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumCommentServiceTests;

public class AddCommentAsyncTests : ForumCommentServiceTestBase
{
    [Fact]
    public async Task AddCommentAsync_WhenValidTopLevelComment_CreatesCommentAndIncrementsPostCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId, commentsCount: 0);

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            Content = "This is a great post!",
            ImageUrl = "https://example.com/comment.png"
        };

        // Act
        var result = await Service.AddCommentAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.Content.Should().Be("This is a great post!");
        result.DepthLevel.Should().Be(1);
        result.ParentCommentId.Should().BeNull();
        result.Status.Should().Be("ACTIVE");
        result.AuthorId.Should().Be(user.UserId);
        result.IsAuthor.Should().BeTrue();

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.CommentsCount.Should().Be(1);
    }

    [Fact]
    public async Task AddCommentAsync_WhenValidReplyToTopLevel_CreatesLevelTwoReply()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId, commentsCount: 1);
        var parent = CreateComment(100, post.PostId, user.UserId, depthLevel: 1);

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            ParentCommentId = parent.CommentId,
            Content = "I agree with your comment."
        };

        // Act
        var result = await Service.AddCommentAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.DepthLevel.Should().Be(2);
        result.ParentCommentId.Should().Be(parent.CommentId);

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.CommentsCount.Should().Be(2);
    }

    [Fact]
    public async Task AddCommentAsync_WhenReplyingToLevelTwoComment_FlattensToLevelOneParent()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);
        var root = CreateComment(100, post.PostId, user.UserId, depthLevel: 1);
        var levelTwo = CreateComment(101, post.PostId, user.UserId, depthLevel: 2, parentCommentId: root.CommentId);

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            ParentCommentId = levelTwo.CommentId,
            Content = "Replying to a reply"
        };

        // Act
        var result = await Service.AddCommentAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.DepthLevel.Should().Be(2);
        result.ParentCommentId.Should().Be(root.CommentId);
    }

    [Fact]
    public async Task AddCommentAsync_WhenPostDoesNotExist_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "John Doe", "john@example.com");
        var request = new CreateCommentRequest
        {
            PostId = 999,
            Content = "Comment on non-existent post"
        };

        // Act
        var act = () => Service.AddCommentAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết không tồn tại.");
    }

    [Fact]
    public async Task AddCommentAsync_WhenPostIsDeleted_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId, status: "DELETED");

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            Content = "Comment on deleted post"
        };

        // Act
        var act = () => Service.AddCommentAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết không tồn tại.");
    }

    [Fact]
    public async Task AddCommentAsync_WhenPostIsNotPublished_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId, status: "HIDDEN");

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            Content = "Comment on hidden post"
        };

        // Act
        var act = () => Service.AddCommentAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết đang trong trạng thái bị ẩn, không thể bình luận.");
    }

    [Fact]
    public async Task AddCommentAsync_WhenPostIsLocked_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId, status: "PUBLISHED", isLocked: true);

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            Content = "Comment on locked post"
        };

        // Act
        var act = () => Service.AddCommentAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết này đã bị khóa bình luận.");
    }

    [Fact]
    public async Task AddCommentAsync_WhenParentCommentNotFound_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            ParentCommentId = 999,
            Content = "Reply to nowhere"
        };

        // Act
        var act = () => Service.AddCommentAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bình luận cha không tồn tại.");
    }

    [Fact]
    public async Task AddCommentAsync_WhenParentCommentBelongsToDifferentPost_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post1 = CreatePost(10, topic.TopicId, user.UserId);
        var post2 = CreatePost(20, topic.TopicId, user.UserId);
        var commentOnPost2 = CreateComment(100, post2.PostId, user.UserId);

        var request = new CreateCommentRequest
        {
            PostId = post1.PostId,
            ParentCommentId = commentOnPost2.CommentId,
            Content = "Cross post comment reply"
        };

        // Act
        var act = () => Service.AddCommentAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bình luận cha không tồn tại.");
    }

    [Fact]
    public async Task AddCommentAsync_WhenContentAndImageUrlHaveSpaces_TrimsFieldsBeforeSaving()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            Content = "   Spaced comment content   ",
            ImageUrl = "   https://example.com/trimmed.png   "
        };

        // Act
        var result = await Service.AddCommentAsync(user.UserId, request);

        // Assert
        result.Content.Should().Be("Spaced comment content");
        result.ImageUrl.Should().Be("https://example.com/trimmed.png");

        var dbComment = await DbContext.ForumComments.FindAsync(result.CommentId);
        dbComment!.Content.Should().Be("Spaced comment content");
        dbComment.ImageUrl.Should().Be("https://example.com/trimmed.png");
    }

    [Fact]
    public async Task AddCommentAsync_WhenIsAnonymousIsTrue_MasksAuthorInResultDto()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "Real Author", "author@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            Content = "Anonymous comment",
            IsAnonymous = true
        };

        // Act
        var result = await Service.AddCommentAsync(user.UserId, request);

        // Assert
        result.IsAnonymous.Should().BeTrue();
        result.AuthorId.Should().Be(0);
        result.AuthorName.Should().Be("Học viên ẩn danh");
        result.AuthorAvatar.Should().BeNull();
        result.AuthorRole.Should().Be("Learner");

        var dbComment = await DbContext.ForumComments.FindAsync(result.CommentId);
        dbComment!.AuthorId.Should().Be(user.UserId);
        dbComment.IsAnonymous.Should().BeTrue();
    }

    [Fact]
    public async Task AddCommentAsync_WhenImageUrlIsNull_SavesSuccessfullyWithNullImage()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);

        var request = new CreateCommentRequest
        {
            PostId = post.PostId,
            Content = "Text only comment",
            ImageUrl = null
        };

        // Act
        var result = await Service.AddCommentAsync(user.UserId, request);

        // Assert
        result.ImageUrl.Should().BeNull();
        var dbComment = await DbContext.ForumComments.FindAsync(result.CommentId);
        dbComment!.ImageUrl.Should().BeNull();
    }
}
