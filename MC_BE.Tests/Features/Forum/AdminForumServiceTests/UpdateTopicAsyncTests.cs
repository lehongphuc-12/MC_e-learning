using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class UpdateTopicAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task UpdateTopicAsync_WhenTopicExists_UpdatesFieldsAndReturnsDto()
    {
        // Arrange
        var topic = CreateTopic(1, "Old Name", "old-slug");
        var request = new CreateForumTopicDto
        {
            Name = "New Name",
            Slug = "new-slug",
            Description = "New Description",
            Icon = "NewIcon",
            OrderIndex = 10
        };

        // Act
        var result = await Service.UpdateTopicAsync(topic.TopicId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("New Name");
        result.Slug.Should().Be("new-slug");
        result.Description.Should().Be("New Description");
        result.Icon.Should().Be("NewIcon");
        result.OrderIndex.Should().Be(10);

        var dbTopic = await DbContext.ForumTopics.FindAsync(topic.TopicId);
        dbTopic!.Name.Should().Be("New Name");
        dbTopic.Slug.Should().Be("new-slug");
    }

    [Fact]
    public async Task UpdateTopicAsync_WhenTopicNotFound_ReturnsNull()
    {
        // Arrange
        var request = new CreateForumTopicDto
        {
            Name = "Non existent",
            Slug = "non-existent"
        };

        // Act
        var result = await Service.UpdateTopicAsync(999, request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateTopicAsync_WhenSlugIsEmpty_KeepsExistingSlugUnchanged()
    {
        // Arrange
        var topic = CreateTopic(1, "Original Topic", "original-slug");
        var request = new CreateForumTopicDto
        {
            Name = "Updated Name",
            Slug = null
        };

        // Act
        var result = await Service.UpdateTopicAsync(topic.TopicId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Slug.Should().Be("original-slug");
        var dbTopic = await DbContext.ForumTopics.FindAsync(topic.TopicId);
        dbTopic!.Slug.Should().Be("original-slug");
    }

    [Fact]
    public async Task UpdateTopicAsync_WhenTopicHasPosts_AccuratelyReturnsPublishedPostsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic With Posts", "topic-with-posts");
        var author = CreateUser(1, "Author", "author@example.com");
        CreatePost(10, topic.TopicId, author.UserId, status: "PUBLISHED");
        CreatePost(11, topic.TopicId, author.UserId, status: "PUBLISHED");
        CreatePost(12, topic.TopicId, author.UserId, status: "DELETED");

        var request = new CreateForumTopicDto
        {
            Name = "Topic With Posts Updated",
            Slug = "topic-with-posts"
        };

        // Act
        var result = await Service.UpdateTopicAsync(topic.TopicId, request);

        // Assert
        result.Should().NotBeNull();
        result!.PostsCount.Should().Be(2);
    }
}
