using System;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumPostServiceTests;

public class CreatePostAsyncTests : ForumPostServiceTestBase
{
    [Fact]
    public async Task CreatePostAsync_WhenRequestIsValid_CreatesPostAndReturnsDto()
    {
        // Arrange
        var topic = CreateTopic(1, "Thảo luận", "thao-luan");
        var author = CreateUser(10, "Author Name", "author@example.com");

        var request = new CreatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "Cách luyện phát âm chuẩn MC",
            Content = "Nội dung chia sẻ các phương pháp luyện giọng và phát âm.",
            ImageUrl = "https://example.com/banner.jpg",
            IsAnonymous = false
        };

        // Act
        var result = await Service.CreatePostAsync(author.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("Cách luyện phát âm chuẩn MC");
        result.Content.Should().Be("Nội dung chia sẻ các phương pháp luyện giọng và phát âm.");
        result.ImageUrl.Should().Be("https://example.com/banner.jpg");
        result.Status.Should().Be("PUBLISHED");
        result.TopicId.Should().Be(topic.TopicId);
        result.AuthorId.Should().Be(author.UserId);
        result.IsAuthor.Should().BeTrue();

        DbContext.ForumPosts.Should().ContainSingle(p => p.Title == "Cách luyện phát âm chuẩn MC");
        var savedPost = DbContext.ForumPosts.First(p => p.Title == "Cách luyện phát âm chuẩn MC");
        savedPost.TopicId.Should().Be(topic.TopicId);
        savedPost.AuthorId.Should().Be(author.UserId);
        savedPost.Status.Should().Be("PUBLISHED");
    }

    [Fact]
    public async Task CreatePostAsync_WhenTopicDoesNotExist_ThrowsInvalidOperationException()
    {
        // Arrange
        var author = CreateUser(10, "Author Name", "author@example.com");
        var request = new CreatePostRequest
        {
            TopicId = 999,
            Title = "Tiêu đề",
            Content = "Nội dung"
        };

        // Act
        var act = () => Service.CreatePostAsync(author.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Chủ đề diễn đàn không tồn tại.");
    }

    [Fact]
    public async Task CreatePostAsync_WhenTitleAndContentHaveLeadingTrailingSpaces_TrimsFieldsBeforeSaving()
    {
        // Arrange
        var topic = CreateTopic(1, "Thảo luận", "thao-luan");
        var author = CreateUser(10, "Author Name", "author@example.com");

        var request = new CreatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "   Tiêu đề có khoảng trắng   ",
            Content = "   Nội dung có khoảng trắng   ",
            ImageUrl = "   https://example.com/img.png   "
        };

        // Act
        var result = await Service.CreatePostAsync(author.UserId, request);

        // Assert
        result.Title.Should().Be("Tiêu đề có khoảng trắng");
        result.Content.Should().Be("Nội dung có khoảng trắng");
        result.ImageUrl.Should().Be("https://example.com/img.png");

        var savedPost = DbContext.ForumPosts.First(p => p.PostId == result.PostId);
        savedPost.Title.Should().Be("Tiêu đề có khoảng trắng");
        savedPost.Content.Should().Be("Nội dung có khoảng trắng");
        savedPost.ImageUrl.Should().Be("https://example.com/img.png");
    }

    [Fact]
    public async Task CreatePostAsync_WhenImageUrlIsNull_CreatesPostSuccessfullyWithNullImage()
    {
        // Arrange
        var topic = CreateTopic(1, "Thảo luận", "thao-luan");
        var author = CreateUser(10, "Author Name", "author@example.com");

        var request = new CreatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "Bài viết không có hình ảnh",
            Content = "Nội dung bài viết",
            ImageUrl = null
        };

        // Act
        var result = await Service.CreatePostAsync(author.UserId, request);

        // Assert
        result.ImageUrl.Should().BeNull();
        var savedPost = DbContext.ForumPosts.First(p => p.PostId == result.PostId);
        savedPost.ImageUrl.Should().BeNull();
    }

    [Fact]
    public async Task CreatePostAsync_WhenIsAnonymousIsTrue_CreatesAnonymousPost()
    {
        // Arrange
        var topic = CreateTopic(1, "Thảo luận", "thao-luan");
        var author = CreateUser(10, "Author Name", "author@example.com");

        var request = new CreatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "Tâm sự nghề MC",
            Content = "Nội dung tâm sự ẩn danh",
            IsAnonymous = true
        };

        // Act
        var result = await Service.CreatePostAsync(author.UserId, request);

        // Assert
        result.IsAnonymous.Should().BeTrue();
        result.AuthorName.Should().Be("Học viên ẩn danh");
        result.AuthorId.Should().Be(0);

        var savedPost = DbContext.ForumPosts.First(p => p.PostId == result.PostId);
        savedPost.IsAnonymous.Should().BeTrue();
        savedPost.AuthorId.Should().Be(author.UserId);
    }
}
