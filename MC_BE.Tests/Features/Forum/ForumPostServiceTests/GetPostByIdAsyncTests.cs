using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumPostServiceTests;

public class GetPostByIdAsyncTests : ForumPostServiceTestBase
{
    [Fact]
    public async Task GetPostByIdAsync_WhenPublishedPostExists_IncrementsViewCountAndReturnsDto()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "John Doe", "john@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, title: "Title", content: "Content", viewsCount: 5);

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: null, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        result!.PostId.Should().Be(post.PostId);
        result.ViewsCount.Should().Be(6);

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.ViewsCount.Should().Be(6);
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenHiddenPostAccessedByAuthor_ReturnsPostSuccessfully()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "HIDDEN");

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: author.UserId, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        result!.PostId.Should().Be(post.PostId);
        result.Status.Should().Be("HIDDEN");
        result.IsAuthor.Should().BeTrue();
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenHiddenPostAccessedByAdmin_ReturnsPostSuccessfully()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        var admin = CreateUser(2, "Admin User", "admin@example.com", roleName: "Admin");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "HIDDEN");

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: admin.UserId, isAdmin: true);

        // Assert
        result.Should().NotBeNull();
        result!.PostId.Should().Be(post.PostId);
        result.Status.Should().Be("HIDDEN");
        result.IsAuthor.Should().BeFalse();
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenPostDoesNotExist_ReturnsNull()
    {
        // Arrange (DB is empty)

        // Act
        var result = await Service.GetPostByIdAsync(999, currentUserId: 1, isAdmin: false);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenPostIsDeleted_ReturnsNull()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "DELETED");

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: author.UserId, isAdmin: true);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenHiddenPostAccessedByNonAuthorNonAdmin_ReturnsNull()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        var otherUser = CreateUser(2, "Other User", "other@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "HIDDEN");

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: otherUser.UserId, isAdmin: false);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenHiddenPostAccessedByGuest_ReturnsNull()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "HIDDEN");

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: null, isAdmin: false);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenPostIsAnonymousAndNonAdmin_MasksAuthorDetails()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Secret Author", "secret@example.com", avatarUrl: "https://secret.png");
        var viewer = CreateUser(2, "Viewer", "viewer@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, isAnonymous: true);

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: viewer.UserId, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        result!.AuthorId.Should().Be(0);
        result.AuthorName.Should().Be("Học viên ẩn danh");
        result.AuthorAvatar.Should().BeNull();
        result.AuthorRole.Should().Be("Learner");
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenPostIsAnonymousAndAdmin_PreservesAuthorDetails()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Secret Author", "secret@example.com", avatarUrl: "https://secret.png");
        var admin = CreateUser(2, "Admin User", "admin@example.com", roleName: "Admin");
        var post = CreatePost(100, topic.TopicId, author.UserId, isAnonymous: true);

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: admin.UserId, isAdmin: true);

        // Assert
        result.Should().NotBeNull();
        result!.AuthorId.Should().Be(author.UserId);
        result.AuthorName.Should().Be("Secret Author");
        result.AuthorAvatar.Should().Be("https://secret.png");
    }

    [Fact]
    public async Task GetPostByIdAsync_WhenUserHasReactionAndReport_PopulatesFlagsCorrectly()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId);

        CreateReaction(1, author.UserId, targetType: "POST", postId: post.PostId, reactionType: "LOVE");
        CreateReport(1, author.UserId, targetType: "POST", postId: post.PostId, reason: "SPAM");

        // Act
        var result = await Service.GetPostByIdAsync(post.PostId, currentUserId: author.UserId, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        result!.UserReaction.Should().Be("LOVE");
        result.UserHasReported.Should().BeTrue();
        result.IsAuthor.Should().BeTrue();
    }
}
