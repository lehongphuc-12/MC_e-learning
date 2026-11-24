using System;
using System.Linq;
using MC_BE.Core.Entities;
using MC_BE.Features.Forum.Services;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MC_BE.Tests.Features.Forum.ForumCommentServiceTests;

public abstract class ForumCommentServiceTestBase : IDisposable
{
    protected readonly SmartMcDbContext DbContext;
    protected readonly ForumCommentService Service;

    protected ForumCommentServiceTestBase()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        DbContext = new SmartMcDbContext(options);
        DbContext.Database.EnsureCreated();

        Service = new ForumCommentService(DbContext);
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
        string title = "Sample Post",
        string content = "Sample Content",
        string status = "PUBLISHED",
        bool isLocked = false,
        int commentsCount = 0)
    {
        var post = new ForumPost
        {
            PostId = postId,
            TopicId = topicId,
            AuthorId = authorId,
            Title = title,
            Content = content,
            Status = status,
            IsLocked = isLocked,
            CommentsCount = commentsCount,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        DbContext.ForumPosts.Add(post);
        DbContext.SaveChanges();
        return post;
    }

    protected ForumComment CreateComment(
        int commentId,
        int? postId,
        int authorId,
        string content = "Sample comment content",
        string status = "ACTIVE",
        int depthLevel = 1,
        int? parentCommentId = null,
        bool isAnonymous = false,
        string? imageUrl = null,
        DateTime? createdAt = null,
        int? lessonId = null)
    {
        var comment = new ForumComment
        {
            CommentId = commentId,
            PostId = postId,
            LessonId = lessonId,
            AuthorId = authorId,
            Content = content,
            Status = status,
            DepthLevel = depthLevel,
            ParentCommentId = parentCommentId,
            IsAnonymous = isAnonymous,
            ImageUrl = imageUrl,
            CreatedAt = createdAt ?? DateTime.UtcNow,
            UpdatedAt = createdAt ?? DateTime.UtcNow,
            ReactionsCount = 0,
            ReportsCount = 0
        };

        DbContext.ForumComments.Add(comment);
        DbContext.SaveChanges();
        return comment;
    }

    protected Course CreateCourse(int courseId, int instructorId, string title = "Sample Course")
    {
        var course = new Course
        {
            CourseId = courseId,
            InstructorId = instructorId,
            Title = title,
            Slug = $"course-{courseId}",
            Status = MC_BE.Core.Enums.CourseStatus.PUBLISHED,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        DbContext.Courses.Add(course);
        DbContext.SaveChanges();
        return course;
    }

    protected Lesson CreateLesson(int lessonId, int courseId, string title = "Sample Lesson")
    {
        var lesson = new Lesson
        {
            LessonId = lessonId,
            CourseId = courseId,
            Title = title,
            Status = MC_BE.Core.Enums.LessonStatus.ACTIVE,
            CreatedAt = DateTime.UtcNow
        };

        DbContext.Lessons.Add(lesson);
        DbContext.SaveChanges();
        return lesson;
    }

    protected ForumReaction CreateReaction(
        int reactionId,
        int userId,
        string targetType = "COMMENT",
        int? commentId = null,
        string reactionType = "LIKE")
    {
        var reaction = new ForumReaction
        {
            ReactionId = reactionId,
            UserId = userId,
            TargetType = targetType,
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
        string targetType = "COMMENT",
        int? commentId = null,
        string reason = "SPAM",
        string status = "PENDING")
    {
        var report = new ForumReport
        {
            ReportId = reportId,
            ReporterId = reporterId,
            TargetType = targetType,
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
