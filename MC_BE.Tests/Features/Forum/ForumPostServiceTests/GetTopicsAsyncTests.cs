using FluentAssertions;
using MC_BE.Core.Entities;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumPostServiceTests;

public class GetTopicsAsyncTests : ForumPostServiceTestBase
{
    [Fact]
    public async Task GetTopicsAsync_WhenActiveTopicsExist_ReturnsOrderedTopicsWithPublishedPostsCount()
    {
        // Arrange
        var topic1 = CreateTopic(1, "Topic A", "topic-a", "ACTIVE", orderIndex: 2);
        var topic2 = CreateTopic(2, "Topic B", "topic-b", "ACTIVE", orderIndex: 1);
        var author = CreateUser(10, "John Doe", "john@example.com");

        CreatePost(101, topic1.TopicId, author.UserId, status: "PUBLISHED");
        CreatePost(102, topic1.TopicId, author.UserId, status: "PUBLISHED");
        CreatePost(103, topic2.TopicId, author.UserId, status: "PUBLISHED");

        // Act
        var result = await Service.GetTopicsAsync();

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);
        result[0].TopicId.Should().Be(topic2.TopicId);
        result[0].OrderIndex.Should().Be(1);
        result[0].PostsCount.Should().Be(1);
        result[1].TopicId.Should().Be(topic1.TopicId);
        result[1].OrderIndex.Should().Be(2);
        result[1].PostsCount.Should().Be(2);
    }

    [Fact]
    public async Task GetTopicsAsync_WhenNoTopicsInDb_SeedsFourDefaultTopicsAndReturnsThem()
    {
        // Arrange (DB starts completely empty of topics)

        // Act
        var result = await Service.GetTopicsAsync();

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(4);
        result.Select(t => t.Slug).Should().Contain(new[]
        {
            "thao-luan-chung",
            "ky-nang-meo-mc",
            "hoi-dap-khoa-hoc",
            "tuyen-dung-show"
        });
        result.All(t => t.PostsCount == 0).Should().BeTrue();

        DbContext.ForumTopics.Count().Should().Be(4);
    }

    [Fact]
    public async Task GetTopicsAsync_WhenOnlyInactiveTopicsExist_SeedsDefaultTopicsAndIgnoresInactive()
    {
        // Arrange
        CreateTopic(1, "Inactive Topic", "inactive-topic", status: "INACTIVE", orderIndex: 1);

        // Act
        var result = await Service.GetTopicsAsync();

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(4);
        result.Should().NotContain(t => t.Slug == "inactive-topic");
        DbContext.ForumTopics.Count(t => t.Status == "ACTIVE").Should().Be(4);
    }

    [Fact]
    public async Task GetTopicsAsync_WhenTopicHasMixedPostStatuses_OnlyCountsPublishedPosts()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic Test", "topic-test", "ACTIVE", orderIndex: 1);
        var author = CreateUser(10, "John Doe", "john@example.com");

        CreatePost(101, topic.TopicId, author.UserId, status: "PUBLISHED");
        CreatePost(102, topic.TopicId, author.UserId, status: "HIDDEN");
        CreatePost(103, topic.TopicId, author.UserId, status: "DELETED");

        // Act
        var result = await Service.GetTopicsAsync();

        // Assert
        result.Should().HaveCount(1);
        result[0].TopicId.Should().Be(topic.TopicId);
        result[0].PostsCount.Should().Be(1);
    }

    [Fact]
    public async Task GetTopicsAsync_WhenActiveTopicHasZeroPosts_ReturnsPostsCountZero()
    {
        // Arrange
        var topic = CreateTopic(1, "Empty Topic", "empty-topic", "ACTIVE", orderIndex: 1);

        // Act
        var result = await Service.GetTopicsAsync();

        // Assert
        result.Should().HaveCount(1);
        result[0].TopicId.Should().Be(topic.TopicId);
        result[0].PostsCount.Should().Be(0);
    }
}
