using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumInteractionServiceTests;

public class CreateReportAsyncTests : ForumInteractionServiceTestBase
{
    [Fact]
    public async Task CreateReportAsync_WhenValidPostReport_CreatesPendingReportAndIncrementsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            Reason = "SPAM",
            Details = "This is spam content"
        };

        // Act
        var result = await Service.CreateReportAsync(reporter.UserId, request);

        // Assert
        result.Should().BeTrue();

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.ReportsCount.Should().Be(1);

        DbContext.ForumReports.Should().ContainSingle(r =>
            r.ReporterId == reporter.UserId &&
            r.PostId == post.PostId &&
            r.TargetType == "POST" &&
            r.Reason == "SPAM" &&
            r.Status == "PENDING");
    }

    [Fact]
    public async Task CreateReportAsync_WhenValidCommentReport_CreatesPendingReportAndIncrementsCount()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId);

        var request = new CreateReportRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            Reason = "HARASSMENT",
            Details = "Inappropriate harassment"
        };

        // Act
        var result = await Service.CreateReportAsync(reporter.UserId, request);

        // Assert
        result.Should().BeTrue();

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.ReportsCount.Should().Be(1);

        DbContext.ForumReports.Should().ContainSingle(r =>
            r.ReporterId == reporter.UserId &&
            r.CommentId == comment.CommentId &&
            r.TargetType == "COMMENT" &&
            r.Reason == "HARASSMENT");
    }

    [Fact]
    public async Task CreateReportAsync_WhenPostReachesFiveReports_AutoHidesPost()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        for (int i = 1; i <= 4; i++)
        {
            var r = CreateUser(10 + i, $"Reporter {i}", $"rep{i}@example.com");
            CreateReport(100 + i, r.UserId, targetType: "POST", postId: post.PostId);
        }

        var fifthReporter = CreateUser(20, "Fifth Reporter", "rep5@example.com");
        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            Reason = "INAPPROPRIATE"
        };

        // Act
        var result = await Service.CreateReportAsync(fifthReporter.UserId, request);

        // Assert
        result.Should().BeTrue();

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.ReportsCount.Should().Be(5);
        dbPost.Status.Should().Be("HIDDEN_BY_REPORTS");
    }

    [Fact]
    public async Task CreateReportAsync_WhenCommentReachesFiveReports_AutoHidesComment()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId);

        for (int i = 1; i <= 4; i++)
        {
            var r = CreateUser(10 + i, $"Reporter {i}", $"rep{i}@example.com");
            CreateReport(100 + i, r.UserId, targetType: "COMMENT", commentId: comment.CommentId);
        }

        var fifthReporter = CreateUser(20, "Fifth Reporter", "rep5@example.com");
        var request = new CreateReportRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            Reason = "INAPPROPRIATE"
        };

        // Act
        var result = await Service.CreateReportAsync(fifthReporter.UserId, request);

        // Assert
        result.Should().BeTrue();

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.ReportsCount.Should().Be(5);
        dbComment.Status.Should().Be("HIDDEN_BY_REPORTS");
    }

    [Fact]
    public async Task CreateReportAsync_WhenTargetTypeIsInvalid_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new CreateReportRequest
        {
            TargetType = "UNKNOWN",
            PostId = 10,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Loại báo cáo không hợp lệ. Phải là POST hoặc COMMENT.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenPostIdIsMissingOrZero_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = 0,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Thiếu ID bài viết.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenPostDoesNotExistOrDeleted_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = 999,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết không tồn tại.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenPostAuthorReportsOwnPost_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(author.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bạn không thể báo cáo bài viết của chính mình.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenPostIsNotPublished_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId, status: "HIDDEN");

        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(reporter.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài viết này đã ở trạng thái tạm ẩn hoặc chờ duyệt.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenUserReportsPostTwice_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        CreateReport(100, reporter.UserId, targetType: "POST", postId: post.PostId);

        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(reporter.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bạn đã báo cáo bài viết này trước đây.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenCommentIdIsMissingOrZero_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new CreateReportRequest
        {
            TargetType = "COMMENT",
            CommentId = null,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Thiếu ID bình luận.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenCommentDoesNotExistOrDeleted_ThrowsInvalidOperationException()
    {
        // Arrange
        var user = CreateUser(1, "User", "user@example.com");
        var request = new CreateReportRequest
        {
            TargetType = "COMMENT",
            CommentId = 999,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(user.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bình luận không tồn tại.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenCommentAuthorReportsOwnComment_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId);

        var request = new CreateReportRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(author.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bạn không thể báo cáo bình luận của chính mình.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenCommentIsNotActive_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId, status: "HIDDEN");

        var request = new CreateReportRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(reporter.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bình luận này đã ở trạng thái tạm ẩn hoặc chờ duyệt.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenUserReportsCommentTwice_ThrowsInvalidOperationException()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(100, post.PostId, author.UserId);
        CreateReport(100, reporter.UserId, targetType: "COMMENT", commentId: comment.CommentId);

        var request = new CreateReportRequest
        {
            TargetType = "COMMENT",
            CommentId = comment.CommentId,
            Reason = "SPAM"
        };

        // Act
        var act = () => Service.CreateReportAsync(reporter.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bạn đã báo cáo bình luận này trước đây.");
    }

    [Fact]
    public async Task CreateReportAsync_WhenDetailsHasTrailingSpaces_TrimsDetails()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            Reason = "OTHER",
            Details = "   Details with whitespace   "
        };

        // Act
        var result = await Service.CreateReportAsync(reporter.UserId, request);

        // Assert
        result.Should().BeTrue();

        var dbReport = await DbContext.ForumReports.FirstAsync(r => r.PostId == post.PostId && r.ReporterId == reporter.UserId);
        dbReport.Details.Should().Be("Details with whitespace");
    }

    [Fact]
    public async Task CreateReportAsync_WhenDetailsIsNull_CreatesReportSuccessfully()
    {
        // Arrange
        var topic = CreateTopic(1, "General", "general");
        var author = CreateUser(1, "Author", "author@example.com");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        var request = new CreateReportRequest
        {
            TargetType = "POST",
            PostId = post.PostId,
            Reason = "OTHER",
            Details = null
        };

        // Act
        var result = await Service.CreateReportAsync(reporter.UserId, request);

        // Assert
        result.Should().BeTrue();

        var dbReport = await DbContext.ForumReports.FirstAsync(r => r.PostId == post.PostId && r.ReporterId == reporter.UserId);
        dbReport.Details.Should().BeNull();
    }
}
