using System;
using System.Linq;
using MC_BE.Core.Entities;
using MC_BE.Features.Forum.Services;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MC_BE.Tests.Features.Forum.ForumInteractionServiceTests;

public abstract class ForumInteractionServiceTestBase : IDisposable
{
    protected readonly SmartMcDbContext DbContext;
    protected readonly ForumInteractionService Service;

    protected ForumInteractionServiceTestBase()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        DbContext = new SmartMcDbContext(options);
        DbContext.Database.EnsureCreated();

        Service = new ForumInteractionService(DbContext);
    }

    protected User CreateUser(int userId, string fullName, string email, string roleName = "Learner")
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

    protected ForumTopic CreateTopic(int topicId, string name, string slug)
    {
        var topic = new ForumTopic
        {
            TopicId = topicId,
            Name = name,
            Slug = slug,
            Status = "ACTIVE",
            OrderIndex = 1,
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
        string status = "PUBLISHED",
        int reactionsCount = 0,
        int reportsCount = 0,
        DateTime? createdAt = null,
        DateTime? restoredAt = null)
    {
        var post = new ForumPost
        {
            PostId = postId,
            TopicId = topicId,
            AuthorId = authorId,
            Title = "Sample Post Title",
            Content = "Sample Post Content",
            Status = status,
            ReactionsCount = reactionsCount,
            ReportsCount = reportsCount,
            CreatedAt = createdAt ?? DateTime.UtcNow,
            UpdatedAt = createdAt ?? DateTime.UtcNow,
            RestoredAt = restoredAt
        };

        DbContext.ForumPosts.Add(post);
        DbContext.SaveChanges();
        return post;
    }

    protected ForumComment CreateComment(
        int commentId,
        int postId,
        int authorId,
        string status = "ACTIVE",
        int reactionsCount = 0,
        int reportsCount = 0,
        DateTime? createdAt = null,
        DateTime? restoredAt = null)
    {
        var comment = new ForumComment
        {
            CommentId = commentId,
            PostId = postId,
            AuthorId = authorId,
            Content = "Sample Comment Content",
            Status = status,
            ReactionsCount = reactionsCount,
            ReportsCount = reportsCount,
            CreatedAt = createdAt ?? DateTime.UtcNow,
            UpdatedAt = createdAt ?? DateTime.UtcNow,
            RestoredAt = restoredAt
        };

        DbContext.ForumComments.Add(comment);
        DbContext.SaveChanges();
        return comment;
    }

    protected ForumReaction CreateReaction(
        int reactionId,
        int userId,
        string targetType,
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
        string targetType,
        int? postId = null,
        int? commentId = null,
        string reason = "SPAM",
        string status = "PENDING",
        DateTime? createdAt = null)
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
            CreatedAt = createdAt ?? DateTime.UtcNow
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
