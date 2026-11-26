using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumPostServiceTests;

public class GetPostsAsyncTests : ForumPostServiceTestBase
{
    [Fact]
    public async Task GetPostsAsync_WhenGuestUserRequests_ReturnsOnlyPublishedPosts()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");

        CreatePost(101, topic.TopicId, author.UserId, title: "Published Post", status: "PUBLISHED");
        CreatePost(102, topic.TopicId, author.UserId, title: "Hidden Post", status: "HIDDEN");
        CreatePost(103, topic.TopicId, author.UserId, title: "Deleted Post", status: "DELETED");

        var query = new PostQueryParameters();

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: null, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        result.TotalItems.Should().Be(1);
        result.Items.Should().ContainSingle(p => p.PostId == 101 && p.Status == "PUBLISHED");
    }

    [Fact]
    public async Task GetPostsAsync_WhenAdminRequests_ReturnsPublishedAndHiddenPostsExcludingDeleted()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        var admin = CreateUser(2, "Admin User", "admin@example.com", roleName: "Admin");

        CreatePost(101, topic.TopicId, author.UserId, title: "Published Post", status: "PUBLISHED");
        CreatePost(102, topic.TopicId, author.UserId, title: "Hidden Post", status: "HIDDEN");
        CreatePost(103, topic.TopicId, author.UserId, title: "Deleted Post", status: "DELETED");

        var query = new PostQueryParameters();

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: admin.UserId, isAdmin: true);

        // Assert
        result.TotalItems.Should().Be(2);
        result.Items.Select(p => p.PostId).Should().BeEquivalentTo(new[] { 101, 102 });
    }

    [Fact]
    public async Task GetPostsAsync_WhenAuthorRequests_ReturnsOwnHiddenPostsAndOtherPublishedPosts()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author1 = CreateUser(1, "Author One", "author1@example.com");
        var author2 = CreateUser(2, "Author Two", "author2@example.com");

        CreatePost(101, topic.TopicId, author1.UserId, title: "Author1 Hidden", status: "HIDDEN");
        CreatePost(102, topic.TopicId, author2.UserId, title: "Author2 Hidden", status: "HIDDEN");
        CreatePost(103, topic.TopicId, author2.UserId, title: "Author2 Published", status: "PUBLISHED");

        var query = new PostQueryParameters();

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: author1.UserId, isAdmin: false);

        // Assert
        result.TotalItems.Should().Be(2);
        result.Items.Select(p => p.PostId).Should().BeEquivalentTo(new[] { 101, 103 });
    }

    [Fact]
    public async Task GetPostsAsync_WhenFilteredByTopicId_ReturnsOnlyPostsUnderSpecificTopic()
    {
        // Arrange
        var topic1 = CreateTopic(1, "Topic 1", "topic-1");
        var topic2 = CreateTopic(2, "Topic 2", "topic-2");
        var author = CreateUser(1, "Author One", "author1@example.com");

        CreatePost(101, topic1.TopicId, author.UserId, title: "Post In Topic 1");
        CreatePost(102, topic2.TopicId, author.UserId, title: "Post In Topic 2");

        var query = new PostQueryParameters { TopicId = topic1.TopicId };

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: author.UserId, isAdmin: false);

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items.First().PostId.Should().Be(101);
        result.Items.First().TopicId.Should().Be(topic1.TopicId);
    }

    [Fact]
    public async Task GetPostsAsync_WhenSearchKeywordProvided_FiltersByTitleOrContentCaseInsensitive()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");

        CreatePost(101, topic.TopicId, author.UserId, title: "Kỹ năng làm chủ micro", content: "Chia sẻ kinh nghiệm");
        CreatePost(102, topic.TopicId, author.UserId, title: "Học MC cơ bản", content: "Cách luyện tập với MICRO tại nhà");
        CreatePost(103, topic.TopicId, author.UserId, title: "Thảo luận", content: "Chủ đề khác");

        var query = new PostQueryParameters { Search = "micro" };

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: null, isAdmin: false);

        // Assert
        result.TotalItems.Should().Be(2);
        result.Items.Select(p => p.PostId).Should().BeEquivalentTo(new[] { 101, 102 });
    }

    [Fact]
    public async Task GetPostsAsync_WhenSortByHot_OrdersByPinnedThenReactionsAndComments()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");

        var postRegular = CreatePost(101, topic.TopicId, author.UserId, reactionsCount: 10, commentsCount: 10, isPinned: false);
        var postHot = CreatePost(102, topic.TopicId, author.UserId, reactionsCount: 50, commentsCount: 50, isPinned: false);
        var postPinned = CreatePost(103, topic.TopicId, author.UserId, reactionsCount: 1, commentsCount: 1, isPinned: true);

        var query = new PostQueryParameters { SortBy = "hot" };

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: null, isAdmin: false);

        // Assert
        result.Items.Select(p => p.PostId).Should().ContainInOrder(103, 102, 101);
    }

    [Fact]
    public async Task GetPostsAsync_WhenSortByMostCommented_OrdersByPinnedThenCommentsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");

        CreatePost(101, topic.TopicId, author.UserId, commentsCount: 5, isPinned: false);
        CreatePost(102, topic.TopicId, author.UserId, commentsCount: 20, isPinned: false);
        CreatePost(103, topic.TopicId, author.UserId, commentsCount: 1, isPinned: true);

        var query = new PostQueryParameters { SortBy = "most_commented" };

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: null, isAdmin: false);

        // Assert
        result.Items.Select(p => p.PostId).Should().ContainInOrder(103, 102, 101);
    }

    [Fact]
    public async Task GetPostsAsync_WhenSortByDefault_OrdersByPinnedThenCreatedAtDescending()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");

        var olderDate = DateTime.UtcNow.AddDays(-2);
        var newerDate = DateTime.UtcNow.AddDays(-1);

        CreatePost(101, topic.TopicId, author.UserId, createdAt: olderDate, isPinned: false);
        CreatePost(102, topic.TopicId, author.UserId, createdAt: newerDate, isPinned: false);
        CreatePost(103, topic.TopicId, author.UserId, createdAt: olderDate, isPinned: true);

        var query = new PostQueryParameters { SortBy = "latest" };

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: null, isAdmin: false);

        // Assert
        result.Items.Select(p => p.PostId).Should().ContainInOrder(103, 102, 101);
    }

    [Fact]
    public async Task GetPostsAsync_WhenPostIsDeleted_NeverReturnsDeletedPost()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        CreatePost(101, topic.TopicId, author.UserId, status: "DELETED");

        var query = new PostQueryParameters();

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: author.UserId, isAdmin: true);

        // Assert
        result.TotalItems.Should().Be(0);
        result.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPostsAsync_WhenPostIsAnonymousAndUserNotAdmin_MasksAuthorDetails()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Real Author", "author@example.com", avatarUrl: "https://real-avatar.png");
        CreatePost(101, topic.TopicId, author.UserId, isAnonymous: true);

        var query = new PostQueryParameters();

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: null, isAdmin: false);

        // Assert
        result.Items.Should().ContainSingle();
        var post = result.Items.First();
        post.AuthorId.Should().Be(0);
        post.AuthorName.Should().Be("Học viên ẩn danh");
        post.AuthorAvatar.Should().BeNull();
        post.AuthorRole.Should().Be("Learner");
    }

    [Fact]
    public async Task GetPostsAsync_WhenPostIsAnonymousAndUserIsAdmin_RevealsRealAuthorDetails()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Real Author", "author@example.com", roleName: "Learner", avatarUrl: "https://real-avatar.png");
        var admin = CreateUser(2, "Admin User", "admin@example.com", roleName: "Admin");
        CreatePost(101, topic.TopicId, author.UserId, isAnonymous: true);

        var query = new PostQueryParameters();

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: admin.UserId, isAdmin: true);

        // Assert
        result.Items.Should().ContainSingle();
        var post = result.Items.First();
        post.AuthorId.Should().Be(author.UserId);
        post.AuthorName.Should().Be("Real Author");
        post.AuthorAvatar.Should().Be("https://real-avatar.png");
    }

    [Fact]
    public async Task GetPostsAsync_WhenPageAndLimitAreZeroOrNegative_DefaultsToPage1AndLimit10()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        CreatePost(101, topic.TopicId, author.UserId);

        var query = new PostQueryParameters { Page = -5, Limit = 0 };

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: null, isAdmin: false);

        // Assert
        result.Page.Should().Be(1);
        result.Limit.Should().Be(10);
        result.Items.Should().ContainSingle();
    }

    [Fact]
    public async Task GetPostsAsync_WhenCurrentUserHasReactedAndReported_SetsUserReactionAndReportedFlag()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var user = CreateUser(1, "Current User", "user@example.com");
        var post = CreatePost(101, topic.TopicId, user.UserId);

        CreateReaction(1, user.UserId, targetType: "POST", postId: post.PostId, reactionType: "LOVE");
        CreateReport(1, user.UserId, targetType: "POST", postId: post.PostId, reason: "SPAM");

        var query = new PostQueryParameters();

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: user.UserId, isAdmin: false);

        // Assert
        result.Items.Should().ContainSingle();
        var postDto = result.Items.First();
        postDto.UserReaction.Should().Be("LOVE");
        postDto.UserHasReported.Should().BeTrue();
        postDto.IsAuthor.Should().BeTrue();
    }

    [Fact]
    public async Task GetPostsAsync_WhenNoPostsMatchFilters_ReturnsEmptyPaginatedResult()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author One", "author1@example.com");
        CreatePost(101, topic.TopicId, author.UserId, title: "Something Else");

        var query = new PostQueryParameters { Search = "nonexistent_query_xyz" };

        // Act
        var result = await Service.GetPostsAsync(query, currentUserId: null, isAdmin: false);

        // Assert
        result.TotalItems.Should().Be(0);
        result.Items.Should().BeEmpty();
    }
}
