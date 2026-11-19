using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class GetAdminPostsAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task GetAdminPostsAsync_WhenPostsExist_ReturnsAllStatusesIncludingHiddenAndDeleted()
    {
        // Arrange
        var author = CreateUser(1, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        CreatePost(10, topic.TopicId, author.UserId, status: "PUBLISHED");
        CreatePost(11, topic.TopicId, author.UserId, status: "HIDDEN_BY_ADMIN");
        CreatePost(12, topic.TopicId, author.UserId, status: "DELETED");

        // Act
        var result = await Service.GetAdminPostsAsync(1, 10, null, null, null);

        // Assert
        result.Should().NotBeNull();
        result.TotalItems.Should().Be(3);
    }

    [Fact]
    public async Task GetAdminPostsAsync_WhenFilteredByTopicId_ReturnsOnlyPostsUnderTopic()
    {
        // Arrange
        var author = CreateUser(1, "Author", "author@example.com");
        var topic1 = CreateTopic(1, "Topic 1", "topic-1");
        var topic2 = CreateTopic(2, "Topic 2", "topic-2");
        CreatePost(10, topic1.TopicId, author.UserId);
        CreatePost(11, topic2.TopicId, author.UserId);

        // Act
        var result = await Service.GetAdminPostsAsync(1, 10, topic1.TopicId, null, null);

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items[0].PostId.Should().Be(10);
    }

    [Fact]
    public async Task GetAdminPostsAsync_WhenFilteredByStatus_ReturnsOnlyPostsWithStatus()
    {
        // Arrange
        var author = CreateUser(1, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        CreatePost(10, topic.TopicId, author.UserId, status: "PUBLISHED");
        CreatePost(11, topic.TopicId, author.UserId, status: "DELETED");

        // Act
        var result = await Service.GetAdminPostsAsync(1, 10, null, "DELETED", null);

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items[0].Status.Should().Be("DELETED");
    }

    [Fact]
    public async Task GetAdminPostsAsync_WhenSearchKeywordProvided_FiltersByTitleContentOrAuthorName()
    {
        // Arrange
        var author = CreateUser(1, "Nguyen Van A", "nguyenvana@example.com");
        var topic = CreateTopic(1, "General", "general");
        CreatePost(10, topic.TopicId, author.UserId, title: "Bi quyet san khau", content: "Chia se");
        CreatePost(11, topic.TopicId, author.UserId, title: "Bai khac", content: "No dung");

        // Act
        var result = await Service.GetAdminPostsAsync(1, 10, null, null, "bi quyet");

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items[0].PostId.Should().Be(10);
    }

    [Fact]
    public async Task GetAdminPostsAsync_WhenPageAndLimitAreInvalid_DefaultsToPage1Limit10()
    {
        // Arrange
        var author = CreateUser(1, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        CreatePost(10, topic.TopicId, author.UserId);

        // Act
        var result = await Service.GetAdminPostsAsync(0, -5, null, null, null);

        // Assert
        result.Page.Should().Be(1);
        result.Limit.Should().Be(10);
        result.TotalItems.Should().Be(1);
    }

    [Fact]
    public async Task GetAdminPostsAsync_WhenNoPostsMatch_ReturnsEmptyList()
    {
        // Arrange (DB empty)

        // Act
        var result = await Service.GetAdminPostsAsync(1, 10, null, null, "not_found_query");

        // Assert
        result.TotalItems.Should().Be(0);
        result.Items.Should().BeEmpty();
    }
}
