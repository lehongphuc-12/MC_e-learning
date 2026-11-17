using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class RestoreCommentAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task RestoreCommentAsync_WhenCommentExists_SetsStatusActiveResetsReportsAndResolvesPendingReports()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var author = CreateUser(2, "Author", "author@example.com");
        var reporter = CreateUser(3, "Reporter", "reporter@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(20, post.PostId, author.UserId, status: "HIDDEN_BY_REPORTS", reportsCount: 5);
        var report = CreateReport(100, reporter.UserId, "COMMENT", commentId: comment.CommentId, status: "PENDING");

        // Act
        var result = await Service.RestoreCommentAsync(comment.CommentId, admin.UserId);

        // Assert
        result.Should().BeTrue();

        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("ACTIVE");
        dbComment.ReportsCount.Should().Be(0);
        dbComment.RestoredAt.Should().NotBeNull();

        var dbReport = await DbContext.ForumReports.FindAsync(report.ReportId);
        dbReport!.Status.Should().Be("RESOLVED");
        dbReport.ResolvedById.Should().Be(admin.UserId);
        dbReport.ResolvedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RestoreCommentAsync_WhenCommentNotFound_ReturnsFalse()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");

        // Act
        var result = await Service.RestoreCommentAsync(999, admin.UserId);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task RestoreCommentAsync_WhenCommentHasNoPendingReports_RestoresSuccessfully()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(20, post.PostId, author.UserId, status: "DELETED");

        // Act
        var result = await Service.RestoreCommentAsync(comment.CommentId, admin.UserId);

        // Assert
        result.Should().BeTrue();
        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("ACTIVE");
    }
}
