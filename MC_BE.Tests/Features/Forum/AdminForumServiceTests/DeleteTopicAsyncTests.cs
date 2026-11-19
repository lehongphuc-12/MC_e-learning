using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class DeleteTopicAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task DeleteTopicAsync_WhenTopicExists_SetsStatusToInactiveAndReturnsTrue()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic To Delete", "topic-to-delete", status: "ACTIVE");

        // Act
        var result = await Service.DeleteTopicAsync(topic.TopicId);

        // Assert
        result.Should().BeTrue();
        var dbTopic = await DbContext.ForumTopics.FindAsync(topic.TopicId);
        dbTopic!.Status.Should().Be("INACTIVE");
    }

    [Fact]
    public async Task DeleteTopicAsync_WhenTopicNotFound_ReturnsFalse()
    {
        // Arrange (DB is empty)

        // Act
        var result = await Service.DeleteTopicAsync(999);

        // Assert
        result.Should().BeFalse();
    }
}
