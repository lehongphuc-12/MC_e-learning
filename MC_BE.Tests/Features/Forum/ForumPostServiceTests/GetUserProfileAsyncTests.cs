using System;
using FluentAssertions;
using MC_BE.Core.Entities;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumPostServiceTests;

public class GetUserProfileAsyncTests : ForumPostServiceTestBase
{
    [Fact]
    public async Task GetUserProfileAsync_WhenUserExists_ReturnsProfileWithPublishedPostsAndActiveCommentsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var user = CreateUser(10, "Nguyen Van A", "a@example.com", roleName: "Coach", avatarUrl: "https://example.com/avatar.png");
        var post = CreatePost(100, topic.TopicId, user.UserId, status: "PUBLISHED");

        CreatePost(101, topic.TopicId, user.UserId, status: "PUBLISHED");
        CreateComment(201, post.PostId, user.UserId, status: "ACTIVE");
        CreateComment(202, post.PostId, user.UserId, status: "ACTIVE");

        // Act
        var result = await Service.GetUserProfileAsync(user.UserId);

        // Assert
        result.Should().NotBeNull();
        result!.UserId.Should().Be(user.UserId);
        result.FullName.Should().Be("Nguyen Van A");
        result.AvatarUrl.Should().Be("https://example.com/avatar.png");
        result.RoleName.Should().Be("Coach");
        result.PostsCount.Should().Be(2);
        result.CommentsCount.Should().Be(2);
    }

    [Fact]
    public async Task GetUserProfileAsync_WhenUserDoesNotExist_ReturnsNull()
    {
        // Arrange (DB has no user with ID 999)

        // Act
        var result = await Service.GetUserProfileAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetUserProfileAsync_WhenUserHasNonPublishedPostsAndNonActiveComments_OnlyCountsPublishedAndActive()
    {
        // Arrange
        var topic = CreateTopic(1, "Topic 1", "topic-1");
        var user = CreateUser(10, "Nguyen Van A", "a@example.com");
        var post = CreatePost(100, topic.TopicId, user.UserId, status: "PUBLISHED");

        // Posts
        CreatePost(101, topic.TopicId, user.UserId, status: "HIDDEN");
        CreatePost(102, topic.TopicId, user.UserId, status: "DELETED");

        // Comments
        CreateComment(201, post.PostId, user.UserId, status: "ACTIVE");
        CreateComment(202, post.PostId, user.UserId, status: "DELETED");
        CreateComment(203, post.PostId, user.UserId, status: "HIDDEN");

        // Act
        var result = await Service.GetUserProfileAsync(user.UserId);

        // Assert
        result.Should().NotBeNull();
        result!.PostsCount.Should().Be(1);
        result.CommentsCount.Should().Be(1);
    }

    [Fact]
    public async Task GetUserProfileAsync_WhenUserHasZeroPostsAndZeroComments_ReturnsCountsAsZero()
    {
        // Arrange
        var user = CreateUser(10, "Empty User", "empty@example.com");

        // Act
        var result = await Service.GetUserProfileAsync(user.UserId);

        // Assert
        result.Should().NotBeNull();
        result!.PostsCount.Should().Be(0);
        result.CommentsCount.Should().Be(0);
    }

    [Fact]
    public async Task GetUserProfileAsync_WhenUserHasNullAvatarUrl_ReturnsNullAvatarUrl()
    {
        // Arrange
        var user = CreateUser(10, "No Avatar User", "noavatar@example.com", avatarUrl: null);

        // Act
        var result = await Service.GetUserProfileAsync(user.UserId);

        // Assert
        result.Should().NotBeNull();
        result!.AvatarUrl.Should().BeNull();
        result.RoleName.Should().Be("Learner");
    }
}
