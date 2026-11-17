using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class ResolveReportAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task ResolveReportAsync_WhenActionIsDismiss_SetsStatusDismissed()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, admin.UserId);
        var report = CreateReport(100, reporter.UserId, "POST", postId: post.PostId);

        // Act
        var result = await Service.ResolveReportAsync(report.ReportId, admin.UserId, "DISMISS");

        // Assert
        result.Should().BeTrue();
        var dbReport = await DbContext.ForumReports.FindAsync(report.ReportId);
        dbReport!.Status.Should().Be("DISMISSED");
        dbReport.ResolvedById.Should().Be(admin.UserId);
        dbReport.ResolvedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task ResolveReportAsync_WhenActionIsHidePost_SetsStatusResolvedAndHidesPost()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, admin.UserId, status: "PUBLISHED");
        var report = CreateReport(100, reporter.UserId, "POST", postId: post.PostId);

        // Act
        var result = await Service.ResolveReportAsync(report.ReportId, admin.UserId, "HIDE");

        // Assert
        result.Should().BeTrue();
        var dbReport = await DbContext.ForumReports.FindAsync(report.ReportId);
        dbReport!.Status.Should().Be("RESOLVED");

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("HIDDEN_BY_ADMIN");
    }

    [Fact]
    public async Task ResolveReportAsync_WhenActionIsDeletePost_SetsStatusResolvedAndDeletesPost()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, admin.UserId, status: "PUBLISHED");
        var report = CreateReport(100, reporter.UserId, "POST", postId: post.PostId);

        // Act
        var result = await Service.ResolveReportAsync(report.ReportId, admin.UserId, "DELETE");

        // Assert
        result.Should().BeTrue();
        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("DELETED");
    }

    [Fact]
    public async Task ResolveReportAsync_WhenActionIsHideComment_SetsStatusResolvedAndHidesComment()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, admin.UserId);
        var comment = CreateComment(20, post.PostId, admin.UserId, status: "ACTIVE");
        var report = CreateReport(100, reporter.UserId, "COMMENT", commentId: comment.CommentId);

        // Act
        var result = await Service.ResolveReportAsync(report.ReportId, admin.UserId, "HIDE");

        // Assert
        result.Should().BeTrue();
        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("HIDDEN_BY_ADMIN");
    }

    [Fact]
    public async Task ResolveReportAsync_WhenActionIsDeleteComment_SetsStatusResolvedAndDeletesComment()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var reporter = CreateUser(2, "Reporter", "reporter@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, admin.UserId);
        var comment = CreateComment(20, post.PostId, admin.UserId, status: "ACTIVE");
        var report = CreateReport(100, reporter.UserId, "COMMENT", commentId: comment.CommentId);

        // Act
        var result = await Service.ResolveReportAsync(report.ReportId, admin.UserId, "DELETE");

        // Assert
        result.Should().BeTrue();
        var dbComment = await DbContext.ForumComments.FindAsync(comment.CommentId);
        dbComment!.Status.Should().Be("DELETED");
    }

    [Fact]
    public async Task ResolveReportAsync_WhenReportNotFound_ReturnsFalse()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");

        // Act
        var result = await Service.ResolveReportAsync(999, admin.UserId, "DISMISS");

        // Assert
        result.Should().BeFalse();
    }
}
