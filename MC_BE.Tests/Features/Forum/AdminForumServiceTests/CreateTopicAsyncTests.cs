using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class CreateTopicAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task CreateTopicAsync_WhenRequestIsValidWithCustomSlug_CreatesTopicAndReturnsDto()
    {
        // Arrange
        var request = new CreateForumTopicDto
        {
            Name = "Kỹ năng phỏng vấn",
            Slug = "ky-nang-phong-van",
            Description = "Chia sẻ kinh nghiệm phỏng vấn MC",
            Icon = "Mic",
            OrderIndex = 5
        };

        // Act
        var result = await Service.CreateTopicAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Kỹ năng phỏng vấn");
        result.Slug.Should().Be("ky-nang-phong-van");
        result.Icon.Should().Be("Mic");
        result.OrderIndex.Should().Be(5);
        result.PostsCount.Should().Be(0);

        var dbTopic = await DbContext.ForumTopics.FindAsync(result.TopicId);
        dbTopic.Should().NotBeNull();
        dbTopic!.Status.Should().Be("ACTIVE");
    }

    [Fact]
    public async Task CreateTopicAsync_WhenSlugIsNull_AutoGeneratesSlugFromTopicName()
    {
        // Arrange
        var request = new CreateForumTopicDto
        {
            Name = "Thao Luan Moi",
            Slug = null,
            Description = "Mo ta",
            OrderIndex = 1
        };

        // Act
        var result = await Service.CreateTopicAsync(request);

        // Assert
        result.Slug.Should().Be("thao-luan-moi");
        var dbTopic = await DbContext.ForumTopics.FindAsync(result.TopicId);
        dbTopic!.Slug.Should().Be("thao-luan-moi");
    }

    [Fact]
    public async Task CreateTopicAsync_WhenFieldsHaveLeadingTrailingSpaces_TrimsFieldsBeforeSaving()
    {
        // Arrange
        var request = new CreateForumTopicDto
        {
            Name = "   Ten Chu De   ",
            Slug = "   slug-chu-de   ",
            Description = "   Mo ta chu de   ",
            Icon = "   IconName   "
        };

        // Act
        var result = await Service.CreateTopicAsync(request);

        // Assert
        result.Name.Should().Be("Ten Chu De");
        result.Slug.Should().Be("slug-chu-de");
        result.Description.Should().Be("Mo ta chu de");
        result.Icon.Should().Be("IconName");
    }

    [Fact]
    public async Task CreateTopicAsync_WhenIconIsNull_DefaultsIconToMessageSquare()
    {
        // Arrange
        var request = new CreateForumTopicDto
        {
            Name = "Chu De Khong Icon",
            Icon = null
        };

        // Act
        var result = await Service.CreateTopicAsync(request);

        // Assert
        result.Icon.Should().Be("MessageSquare");
        var dbTopic = await DbContext.ForumTopics.FindAsync(result.TopicId);
        dbTopic!.Icon.Should().Be("MessageSquare");
    }
}
