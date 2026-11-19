using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class RestorePostAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task RestorePostAsync_WhenPostExists_SetsStatusPublishedResetsReportsAndResolvesPendingReports()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var author = CreateUser(2, "Author", "author@example.com");
        var reporter = CreateUser(3, "Reporter", "reporter@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId, status: "HIDDEN_BY_REPORTS", reportsCount: 5);
        var report = CreateReport(100, reporter.UserId, "POST", postId: post.PostId, status: "PENDING");

        // Act
        var result = await Service.RestorePostAsync(post.PostId, admin.UserId);

        // Assert
        result.Should().BeTrue();

        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("PUBLISHED");
        dbPost.ReportsCount.Should().Be(0);
        dbPost.RestoredAt.Should().NotBeNull();

        var dbReport = await DbContext.ForumReports.FindAsync(report.ReportId);
        dbReport!.Status.Should().Be("RESOLVED");
        dbReport.ResolvedById.Should().Be(admin.UserId);
        dbReport.ResolvedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RestorePostAsync_WhenPostNotFound_ReturnsFalse()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");

        // Act
        var result = await Service.RestorePostAsync(999, admin.UserId);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task RestorePostAsync_WhenPostHasNoPendingReports_RestoresSuccessfully()
    {
        // Arrange
        var admin = CreateUser(1, "Admin", "admin@example.com", roleName: "Admin");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId, status: "DELETED");

        // Act
        var result = await Service.RestorePostAsync(post.PostId, admin.UserId);

        // Assert
        result.Should().BeTrue();
        var dbPost = await DbContext.ForumPosts.FindAsync(post.PostId);
        dbPost!.Status.Should().Be("PUBLISHED");
    }
}
