using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumInteractionServiceTests;

public class ToggleReactionAsyncTests : ForumInteractionServiceTestBase
{
    [Fact]
    public async Task ToggleReactionAsync_WhenAddingNewPostReaction_CreatesReactionAndIncrementsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "Liker", "liker@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId, reactionsCount: 0);

        var request = new ToggleReactionRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            ReactionType = "LIKE"
        };

        // Act
        var result = await Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.IsReacted.Should().BeTrue();
        result.ReactionType.Should().Be("LIKE");
        result.TotalReactions.Should().Be(1);

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.ReactionsCount.Should().Be(1);

        DbContext.ForumReactions.Should().ContainSingle(r => r.UserId == user.UserId && r.PostId == post.PostId && r.ReactionType == "LIKE");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenTogglingOffExistingPostReaction_RemovesReactionAndDecrementsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "Liker", "liker@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId, reactionsCount: 1);
        CreateReaction(100, user.UserId, targetType: "POST", postId: post.PostId, reactionType: "LIKE");

        var request = new ToggleReactionRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            ReactionType = "LIKE"
        };

        // Act
        var result = await Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.IsReacted.Should().BeFalse();
        result.ReactionType.Should().BeNull();
        result.TotalReactions.Should().Be(0);

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.ReactionsCount.Should().Be(0);

        DbContext.ForumReactions.Should().NotContain(r => r.UserId == user.UserId && r.PostId == post.PostId);
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenSwitchingPostReactionType_UpdatesReactionTypeWithoutChangingCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "Liker", "liker@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId, reactionsCount: 1);
        CreateReaction(100, user.UserId, targetType: "POST", postId: post.PostId, reactionType: "LIKE");

        var request = new ToggleReactionRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            ReactionType = "LOVE"
        };

        // Act
        var result = await Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.IsReacted.Should().BeTrue();
        result.ReactionType.Should().Be("LOVE");
        result.TotalReactions.Should().Be(1);

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.ReactionsCount.Should().Be(1);

        DbContext.ForumReactions.Should().ContainSingle(r => r.UserId == user.UserId && r.PostId == post.PostId && r.ReactionType == "LOVE");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenAddingNewCommentReaction_CreatesReactionAndIncrementsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "Liker", "liker@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId, reactionsCount: 0);

        var request = new ToggleReactionRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            ReactionType = "HELPFUL"
        };

        // Act
        var result = await Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.IsReacted.Should().BeTrue();
        result.ReactionType.Should().Be("HELPFUL");
        result.TotalReactions.Should().Be(1);

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.ReactionsCount.Should().Be(1);
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenTogglingOffExistingCommentReaction_RemovesReactionAndDecrementsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "Liker", "liker@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId, reactionsCount: 1);
        CreateReaction(100, user.UserId, targetType: "COMMENT", commentId: comment.CommentId, reactionType: "LIKE");

        var request = new ToggleReactionRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            ReactionType = "LIKE"
        };

        // Act
        var result = await Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.IsReacted.Should().BeFalse();
        result.ReactionType.Should().BeNull();
        result.TotalReactions.Should().Be(0);

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.ReactionsCount.Should().Be(0);
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenSwitchingCommentReactionType_UpdatesReactionTypeWithoutChangingCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "Liker", "liker@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId, reactionsCount: 1);
        CreateReaction(100, user.UserId, targetType: "COMMENT", commentId: comment.CommentId, reactionType: "LIKE");

        var request = new ToggleReactionRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            ReactionType = "HELPFUL"
        };

        // Act
        var result = await Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.IsReacted.Should().BeTrue();
        result.ReactionType.Should().Be("HELPFUL");
        result.TotalReactions.Should().Be(1);

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.ReactionsCount.Should().Be(1);
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenTargetTypeIsInvalid_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new ToggleReactionRequest
        {
            TargetType = "INVALID_TARGET",
            PostId = 10,
            ReactionType = "LIKE"
        };

        // Act
        var act = () => Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Loại tương tác không hợp lệ. Phải là POST hoặc COMMENT.");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenPostIdIsMissingOrZero_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new ToggleReactionRequest
        {
            TargetType = "POST",
            PostId = null,
            ReactionType = "LIKE"
        };

        // Act
        var act = () => Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Thiếu ID bài viết.");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenPostDoesNotExistOrDeleted_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "User", "user@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId, status: "DELETED");

        var request = new ToggleReactionRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            ReactionType = "LIKE"
        };

        // Act
        var act = () => Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết không tồn tại.");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenPostIsNotPublished_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "User", "user@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId, status: "HIDDEN");

        var request = new ToggleReactionRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            ReactionType = "LIKE"
        };

        // Act
        var act = () => Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết đang trong trạng thái tạm ẩn, không thể thả tương tác.");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenCommentIdIsMissingOrZero_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new ToggleReactionRequest
        {
            TargetType = "COMMENT",
            CommentId = 0,
            ReactionType = "LIKE"
        };

        // Act
        var act = () => Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Thiếu ID bình luận.");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenCommentDoesNotExistOrDeleted_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new ToggleReactionRequest
        {
            TargetType = "COMMENT",
            CommentId = 999,
            ReactionType = "LIKE"
        };

        // Act
        var act = () => Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bình luận không tồn tại.");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenCommentIsNotActive_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "User", "user@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId, status: "HIDDEN");

        var request = new ToggleReactionRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            ReactionType = "LIKE"
        };

        // Act
        var act = () => Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bình luận đang trong trạng thái tạm ẩn, không thể thả tương tác.");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenTargetTypeHasMixedCase_HandlesCorrectly()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "Liker", "liker@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        var request = new ToggleReactionRequest
        {
            TargetType = "pOsT",
            PostId = post.PostId,
            ReactionType = "like"
        };

        // Act
        var result = await Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        result.IsReacted.Should().BeTrue();
        result.ReactionType.Should().Be("LIKE");
    }

    [Fact]
    public async Task ToggleReactionAsync_WhenTogglingOffWithCountZero_DoesNotDecrementBelowZero()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var user = CreateUser(2, "Liker", "liker@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId, reactionsCount: 0);
        CreateReaction(100, user.UserId, targetType: "POST", postId: post.PostId, reactionType: "LIKE");

        var request = new ToggleReactionRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            ReactionType = "LIKE"
        };

        // Act
        var result = await Service.ToggleReactionAsync(user.UserId, request);

        // Assert
        result.TotalReactions.Should().Be(0);
        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.ReactionsCount.Should().Be(0);
    }
}
