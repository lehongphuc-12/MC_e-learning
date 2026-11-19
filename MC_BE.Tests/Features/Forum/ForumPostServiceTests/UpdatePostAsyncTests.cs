using System;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumPostServiceTests;

public class UpdatePostAsyncTests : ForumPostServiceTestBase
{
    [Fact]
    public async Task UpdatePostAsync_WhenValidRequestByAuthor_UpdatesPostAndReturnsDto()
    {
        // Arrange
        var topic1 = CreateTopic(1, "Topic 1", "topic-1");
        var topic2 = CreateTopic(2, "Topic 2", "topic-2");
        var author = CreateUser(10, "Author User", "author@example.com");
        var post = CreatePost(100, topic1.TopicId, author.UserId, title: "Old Title", content: "Old Content");

        var request = new UpdatePostRequest
        {
            TopicId = topic2.TopicId,
            Title = "New Updated Title",
            Content = "New Updated Content",
            ImageUrl = "https://example.com/updated.png",
            IsAnonymous = true
        };

        // Act
        var result = await Service.UpdatePostAsync(post.PostId, author.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("New Updated Title");
        result.Content.Should().Be("New Updated Content");
        result.ImageUrl.Should().Be("https://example.com/updated.png");
        result.TopicId.Should().Be(topic2.TopicId);

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Title.Should().Be("New Updated Title");
        dbPost.Content.Should().Be("New Updated Content");
        dbPost.TopicId.Should().Be(topic2.TopicId);
        dbPost.ImageUrl.Should().Be("https://example.com/updated.png");
        dbPost.IsAnonymous.Should().BeTrue();
    }

    [Fact]
    public async Task UpdatePostAsync_WhenPostDoesNotExist_ReturnsNull()
    {
        // Arrange
        var request = new UpdatePostRequest
        {
            TopicId = 1,
            Title = "Title",
            Content = "Content"
        };

        // Act
        var result = await Service.UpdatePostAsync(999, userId: 1, request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdatePostAsync_WhenPostIsDeleted_ReturnsNull()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "DELETED");

        var request = new UpdatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "Title",
            Content = "Content"
        };

        // Act
        var result = await Service.UpdatePostAsync(post.PostId, author.UserId, request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdatePostAsync_WhenUserIsNotAuthor_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var otherUser = CreateUser(20, "Other User", "other@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "PUBLISHED");

        var request = new UpdatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "Hacked Title",
            Content = "Hacked Content"
        };

        // Act
        var act = () => Service.UpdatePostAsync(post.PostId, otherUser.UserId, request);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Bạn không có quyền chỉnh sửa bài viết của người khác.");
    }

    [Fact]
    public async Task UpdatePostAsync_WhenPostIsNotPublished_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "HIDDEN");

        var request = new UpdatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "Updated Title",
            Content = "Updated Content"
        };

        // Act
        var act = () => Service.UpdatePostAsync(post.PostId, author.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết đang trong trạng thái tạm ẩn, không thể chỉnh sửa.");
    }

    [Fact]
    public async Task UpdatePostAsync_WhenFieldsHaveLeadingTrailingSpaces_TrimsFieldsProperly()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, status: "PUBLISHED");

        var request = new UpdatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "   Tiêu đề cập nhật   ",
            Content = "   Nội dung cập nhật   ",
            ImageUrl = "   https://example.com/updated.png   "
        };

        // Act
        var result = await Service.UpdatePostAsync(post.PostId, author.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Tiêu đề cập nhật");
        result.Content.Should().Be("Nội dung cập nhật");
        result.ImageUrl.Should().Be("https://example.com/updated.png");

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Title.Should().Be("Tiêu đề cập nhật");
        dbPost.Content.Should().Be("Nội dung cập nhật");
        dbPost.ImageUrl.Should().Be("https://example.com/updated.png");
    }

    [Fact]
    public async Task UpdatePostAsync_WhenImageUrlIsNull_UpdatesSuccessfullyWithNullImage()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var author = CreateUser(10, "Author User", "author@example.com");
        var post = CreatePost(100, topic.TopicId, author.UserId, imageUrl: "https://example.com/old.png");

        var request = new UpdatePostRequest
        {
            TopicId = topic.TopicId,
            Title = "Updated Title",
            Content = "Updated Content",
            ImageUrl = null
        };

        // Act
        var result = await Service.UpdatePostAsync(post.PostId, author.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result!.ImageUrl.Should().BeNull();

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.ImageUrl.Should().BeNull();
    }
}
