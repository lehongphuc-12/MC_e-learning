using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.AdminForumServiceTests;

public class GetReportsAsyncTests : AdminForumServiceTestBase
{
    [Fact]
    public async Task GetReportsAsync_WhenReportsExist_ReturnsPaginatedListWithMappedDetails()
    {
        // Arrange
        var reporter = CreateUser(1, "Reporter User", "reporter@example.com");
        var author = CreateUser(2, "Author User", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId, title: "Reported Post");
        CreateReport(100, reporter.UserId, "POST", postId: post.PostId, reason: "SPAM");

        // Act
        var result = await Service.GetReportsAsync(1, 10, null, null);

        // Assert
        result.Should().NotBeNull();
        result.TotalItems.Should().Be(1);
        var report = result.Items[0];
        report.ReportId.Should().Be(100);
        report.ReporterName.Should().Be("Reporter User");
        report.PostTitle.Should().Be("Reported Post");
        report.AuthorName.Should().Be("Author User");
        report.Reason.Should().Be("SPAM");
    }

    [Fact]
    public async Task GetReportsAsync_WhenFilteredByStatus_ReturnsMatchingReports()
    {
        // Arrange
        var reporter = CreateUser(1, "Reporter", "reporter@example.com");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);

        CreateReport(100, reporter.UserId, "POST", postId: post.PostId, status: "PENDING");
        CreateReport(101, reporter.UserId, "POST", postId: post.PostId, status: "RESOLVED");

        // Act
        var result = await Service.GetReportsAsync(1, 10, "PENDING", null);

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items[0].ReportId.Should().Be(100);
    }

    [Fact]
    public async Task GetReportsAsync_WhenFilteredByTargetType_ReturnsMatchingReports()
    {
        // Arrange
        var reporter = CreateUser(1, "Reporter", "reporter@example.com");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(20, post.PostId, author.UserId);

        CreateReport(100, reporter.UserId, "POST", postId: post.PostId);
        CreateReport(101, reporter.UserId, "COMMENT", commentId: comment.CommentId);

        // Act
        var result = await Service.GetReportsAsync(1, 10, null, "COMMENT");

        // Assert
        result.TotalItems.Should().Be(1);
        result.Items[0].ReportId.Should().Be(101);
    }

    [Fact]
    public async Task GetReportsAsync_WhenTargetIsComment_MapsCommentSnippetAndContent()
    {
        // Arrange
        var reporter = CreateUser(1, "Reporter", "reporter@example.com");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var comment = CreateComment(20, post.PostId, author.UserId, content: "Short comment text");

        CreateReport(100, reporter.UserId, "COMMENT", commentId: comment.CommentId);

        // Act
        var result = await Service.GetReportsAsync(1, 10, null, "COMMENT");

        // Assert
        result.Items[0].CommentContent.Should().Be("Short comment text");
        result.Items[0].CommentSnippet.Should().Be("Short comment text");
    }

    [Fact]
    public async Task GetReportsAsync_WhenPageAndLimitAreInvalid_DefaultsToPage1Limit10()
    {
        // Arrange
        var reporter = CreateUser(1, "Reporter", "reporter@example.com");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        CreateReport(100, reporter.UserId, "POST", postId: post.PostId);

        // Act
        var result = await Service.GetReportsAsync(-1, 0, null, null);

        // Assert
        result.Page.Should().Be(1);
        result.Limit.Should().Be(10);
        result.TotalItems.Should().Be(1);
    }

    [Fact]
    public async Task GetReportsAsync_WhenCommentContentExceeds80Chars_TruncatesSnippetWithEllipsis()
    {
        // Arrange
        var reporter = CreateUser(1, "Reporter", "reporter@example.com");
        var author = CreateUser(2, "Author", "author@example.com");
        var topic = CreateTopic(1, "General", "general");
        var post = CreatePost(10, topic.TopicId, author.UserId);
        var longText = new string('A', 100);
        var comment = CreateComment(20, post.PostId, author.UserId, content: longText);

        CreateReport(100, reporter.UserId, "COMMENT", commentId: comment.CommentId);

        // Act
        var result = await Service.GetReportsAsync(1, 10, null, null);

        // Assert
        result.Items[0].CommentSnippet.Should().HaveLength(83); // 80 chars + "..."
        result.Items[0].CommentSnippet.Should().EndWith("...");
    }

    [Fact]
    public async Task GetReportsAsync_WhenNoReportsMatchFilter_ReturnsEmptyList()
    {
        // Arrange (DB is empty)

        // Act
        var result = await Service.GetReportsAsync(1, 10, "DISMISSED", "POST");

        // Assert
        result.TotalItems.Should().Be(0);
        result.Items.Should().BeEmpty();
    }
}
