using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumCommentServiceTests;

public class GetCommentsByPostIdAsyncTests : ForumCommentServiceTestBase
{
    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenCommentsExist_ReturnsTwoLevelHierarchy()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);

        var parentComment = CreateComment(100, post.PostId, user.UserId, content: "Parent comment", depthLevel: 1);
        var replyComment = CreateComment(101, post.PostId, user.UserId, content: "Child reply", depthLevel: 2, parentCommentId: parentComment.CommentId);

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: user.UserId, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result[0].CommentId.Should().Be(parentComment.CommentId);
        result[0].Replies.Should().HaveCount(1);
        result[0].Replies[0].CommentId.Should().Be(replyComment.CommentId);
    }

    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenPostHasNoComments_ReturnsEmptyList()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: null, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenCommentIsDeleted_ExcludesFromResults()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);

        CreateComment(100, post.PostId, user.UserId, content: "Active comment", status: "ACTIVE");
        CreateComment(101, post.PostId, user.UserId, content: "Deleted comment", status: "DELETED");

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: null, isAdmin: false);

        // Assert
        result.Should().HaveCount(1);
        result[0].CommentId.Should().Be(100);
    }

    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenCommentIsHiddenAndUserIsNotAuthorNorAdmin_MasksContent()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var viewer = CreateUser(2, "Viewer", "viewer@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        CreateComment(100, post.PostId, author.UserId, content: "Offensive text", status: "HIDDEN");

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: viewer.UserId, isAdmin: false);

        // Assert
        result.Should().HaveCount(1);
        result[0].Content.Should().Be("[Bình luận này đang bị ẩn do vi phạm quy chuẩn]");
    }

    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenCommentIsHiddenAndUserIsAuthor_ShowsOriginalContent()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        CreateComment(100, post.PostId, author.UserId, content: "My hidden comment", status: "HIDDEN");

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: author.UserId, isAdmin: false);

        // Assert
        result.Should().HaveCount(1);
        result[0].Content.Should().Be("My hidden comment");
        result[0].IsAuthor.Should().BeTrue();
    }

    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenCommentIsHiddenAndUserIsAdmin_ShowsOriginalContent()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var admin = CreateUser(2, "Admin User", "admin@example.com", roleName: "Admin");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        CreateComment(100, post.PostId, author.UserId, content: "Reported content", status: "HIDDEN");

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: admin.UserId, isAdmin: true);

        // Assert
        result.Should().HaveCount(1);
        result[0].Content.Should().Be("Reported content");
        result[0].IsAuthor.Should().BeFalse();
    }

    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenCommentIsAnonymousAndUserIsNotAdmin_MasksAuthorDetails()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Real Name", "real@example.com");
        var viewer = CreateUser(2, "Viewer", "viewer@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        CreateComment(100, post.PostId, author.UserId, isAnonymous: true);

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: viewer.UserId, isAdmin: false);

        // Assert
        result.Should().HaveCount(1);
        result[0].AuthorId.Should().Be(0);
        result[0].AuthorName.Should().Be("Học viên ẩn danh");
        result[0].AuthorAvatar.Should().BeNull();
        result[0].AuthorRole.Should().Be("Learner");
    }

    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenCommentIsAnonymousAndUserIsAdmin_RevealsAuthorDetails()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Real Name", "real@example.com", avatarUrl: "https://real-avatar.com");
        var admin = CreateUser(2, "Admin User", "admin@example.com", roleName: "Admin");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        CreateComment(100, post.PostId, author.UserId, isAnonymous: true);

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: admin.UserId, isAdmin: true);

        // Assert
        result.Should().HaveCount(1);
        result[0].AuthorId.Should().Be(author.UserId);
        result[0].AuthorName.Should().Be("Real Name");
        result[0].AuthorAvatar.Should().Be("https://real-avatar.com");
    }

    [Fact]
    public async Task GetCommentsByPostIdAsync_WhenUserHasReactionAndReport_PopulatesFlagsCorrectly()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "User", "user@example.com");
        var post = CreatePost(10, topic.TopicId, user.UserId);

        var comment = CreateComment(100, post.PostId, user.UserId);
        CreateReaction(1, user.UserId, targetType: "COMMENT", commentId: comment.CommentId, reactionType: "LIKE");
        CreateReport(1, user.UserId, targetType: "COMMENT", commentId: comment.CommentId, reason: "SPAM");

        // Act
        var result = await Service.GetCommentsByPostIdAsync(post.PostId, currentUserId: user.UserId, isAdmin: false);

        // Assert
        result.Should().HaveCount(1);
        result[0].UserReaction.Should().Be("LIKE");
        result[0].UserHasReported.Should().BeTrue();
        result[0].IsAuthor.Should().BeTrue();
    }
}
