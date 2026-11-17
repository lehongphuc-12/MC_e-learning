using System;
using MC_BE.Core.Entities;
using MC_BE.Features.Forum.Services;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MC_BE.Tests.Features.Forum.ForumPostServiceTests;

public abstract class ForumPostServiceTestBase : IDisposable
{
    protected readonly SmartMcDbContext DbContext;
    protected readonly ForumPostService Service;

    protected ForumPostServiceTestBase()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        DbContext = new SmartMcDbContext(options);
        DbContext.Database.EnsureCreated();

        Service = new ForumPostService(DbContext);
    }

    protected User CreateUser(int userId, string fullName, string email, string roleName = "Learner", string? avatarUrl = "https://example.com/avatar.png")
    {
        var role = DbContext.Roles.FirstOrDefault(r => r.RoleName == roleName);
        if (role == null)
        {
            role = new Role { RoleName = roleName };
            DbContext.Roles.Add(role);
            DbContext.SaveChanges();
        }

        var user = new User
        {
            UserId = userId,
            FullName = fullName,
            Email = email,
            AvatarUrl = avatarUrl,
            PasswordHash = "hashed_pass",
            RoleId = role.RoleId,
            Role = role,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };

        DbContext.Users.Add(user);
        DbContext.SaveChanges();
        return user;
    }

    protected ForumTopic CreateTopic(int topicId, string name, string slug, string status = "ACTIVE", int orderIndex = 1)
    {
        var topic = new ForumTopic
        {
            TopicId = topicId,
            Name = name,
            Slug = slug,
            Status = status,
            OrderIndex = orderIndex,
            Description = $"Description for {name}",
            Icon = "MessageSquare",
            CreatedAt = DateTime.UtcNow
        };

        DbContext.ForumTopics.Add(topic);
        DbContext.SaveChanges();
        return topic;
    }

    protected ForumPost CreatePost(
        int postId,
        int topicId,
        int authorId,
        string title = "Sample Title",
        string content = "Sample Content",
        string status = "PUBLISHED",
        string? imageUrl = null,
        bool isAnonymous = false,
        bool isPinned = false,
        bool isLocked = false,
        int viewsCount = 0,
        int reactionsCount = 0,
        int commentsCount = 0,
        int reportsCount = 0,
        DateTime? createdAt = null)
    {
        var post = new ForumPost
        {
            PostId = postId,
            TopicId = topicId,
            AuthorId = authorId,
            Title = title,
            Content = content,
            ImageUrl = imageUrl,
            Status = status,
            IsAnonymous = isAnonymous,
            IsPinned = isPinned,
            IsLocked = isLocked,
            CreatedAt = createdAt ?? DateTime.UtcNow,
            UpdatedAt = createdAt ?? DateTime.UtcNow,
            ViewsCount = viewsCount,
            ReactionsCount = reactionsCount,
            CommentsCount = commentsCount,
            ReportsCount = reportsCount
        };

        DbContext.ForumPosts.Add(post);
        DbContext.SaveChanges();
        return post;
    }

    protected ForumComment CreateComment(
        int commentId,
        int postId,
        int authorId,
        string content = "Sample Comment",
        string status = "ACTIVE",
        int? parentCommentId = null)
    {
        var comment = new ForumComment
        {
            CommentId = commentId,
            PostId = postId,
            AuthorId = authorId,
            Content = content,
            Status = status,
            ParentCommentId = parentCommentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        DbContext.ForumComments.Add(comment);
        DbContext.SaveChanges();
        return comment;
    }

    protected ForumReaction CreateReaction(
        int reactionId,
        int userId,
        string targetType = "POST",
        int? postId = null,
        int? commentId = null,
        string reactionType = "LIKE")
    {
        var reaction = new ForumReaction
        {
            ReactionId = reactionId,
            UserId = userId,
            TargetType = targetType,
            PostId = postId,
            CommentId = commentId,
            ReactionType = reactionType,
            CreatedAt = DateTime.UtcNow
        };

        DbContext.ForumReactions.Add(reaction);
        DbContext.SaveChanges();
        return reaction;
    }

    protected ForumReport CreateReport(
        int reportId,
        int reporterId,
        string targetType = "POST",
        int? postId = null,
        int? commentId = null,
        string reason = "SPAM",
        string status = "PENDING")
    {
        var report = new ForumReport
        {
            ReportId = reportId,
            ReporterId = reporterId,
            TargetType = targetType,
            PostId = postId,
            CommentId = commentId,
            Reason = reason,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };

        DbContext.ForumReports.Add(report);
        DbContext.SaveChanges();
        return report;
    }

    public void Dispose()
    {
        DbContext.Database.EnsureDeleted();
        DbContext.Dispose();
        GC.SuppressFinalize(this);
    }
}
