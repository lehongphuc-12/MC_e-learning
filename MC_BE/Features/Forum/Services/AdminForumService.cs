using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Forum.Services;

public class AdminForumService : IAdminForumService
{
    private readonly SmartMcDbContext _context;

    public AdminForumService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedResult<ForumReportDto>> GetReportsAsync(int page, int limit, string? status, string? targetType)
    {
        var query = _context.ForumReports
            .Include(r => r.Reporter)
            .Include(r => r.ResolvedBy)
            .Include(r => r.Post).ThenInclude(p => p!.Author)
            .Include(r => r.Post).ThenInclude(p => p!.Topic)
            .Include(r => r.Comment).ThenInclude(c => c!.Author)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status.ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(targetType))
        {
            query = query.Where(r => r.TargetType == targetType.ToUpper());
        }

        var totalItems = await query.CountAsync();
        page = page > 0 ? page : 1;
        limit = limit > 0 ? limit : 10;

        var reports = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = reports.Select(r =>
        {
            int authorId = 0;
            string authorName = "N/A";
            string? authorEmail = null;
            string targetStatus = "ACTIVE";
            string? postTitle = null;
            string? postContent = null;
            string? postImageUrl = null;
            string? postTopicName = null;
            string? commentSnippet = null;
            string? commentContent = null;
            string? commentImageUrl = null;

            if (r.TargetType == "POST" && r.Post != null)
            {
                authorId = r.Post.AuthorId;
                authorName = r.Post.Author?.FullName ?? "Học viên";
                authorEmail = r.Post.Author?.Email;
                targetStatus = r.Post.Status;
                postTitle = r.Post.Title;
                postContent = r.Post.Content;
                postImageUrl = r.Post.ImageUrl;
                postTopicName = r.Post.Topic?.Name;
            }
            else if (r.TargetType == "COMMENT" && r.Comment != null)
            {
                authorId = r.Comment.AuthorId;
                authorName = r.Comment.Author?.FullName ?? "Học viên";
                authorEmail = r.Comment.Author?.Email;
                targetStatus = r.Comment.Status;
                commentContent = r.Comment.Content;
                commentImageUrl = r.Comment.ImageUrl;
                commentSnippet = r.Comment.Content.Length > 80 ? r.Comment.Content.Substring(0, 80) + "..." : r.Comment.Content;
            }

            return new ForumReportDto
            {
                ReportId = r.ReportId,
                ReporterId = r.ReporterId,
                ReporterName = r.Reporter?.FullName ?? "Người dùng",
                TargetType = r.TargetType,
                PostId = r.PostId,
                PostTitle = postTitle,
                PostContent = postContent,
                PostImageUrl = postImageUrl,
                PostTopicName = postTopicName,
                CommentId = r.CommentId,
                CommentSnippet = commentSnippet,
                CommentContent = commentContent,
                CommentImageUrl = commentImageUrl,
                AuthorId = authorId,
                AuthorName = authorName,
                AuthorEmail = authorEmail,
                TargetStatus = targetStatus,
                Reason = r.Reason,
                Details = r.Details,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
                ResolvedAt = r.ResolvedAt,
                ResolvedByName = r.ResolvedBy?.FullName
            };
        }).ToList();

        return new PaginatedResult<ForumReportDto>(items, totalItems, page, limit);
    }

    public async Task<PaginatedResult<ForumPostDto>> GetAdminPostsAsync(int page, int limit, int? topicId, string? status, string? search)
    {
        var query = _context.ForumPosts
            .Include(p => p.Topic)
            .Include(p => p.Author)
            .AsNoTracking();

        if (topicId.HasValue && topicId.Value > 0)
        {
            query = query.Where(p => p.TopicId == topicId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(p => p.Status == status.ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Title.ToLower().Contains(s) 
                || p.Content.ToLower().Contains(s) 
                || (p.Author != null && p.Author.FullName.ToLower().Contains(s)));
        }

        var totalItems = await query.CountAsync();
        page = page > 0 ? page : 1;
        limit = limit > 0 ? limit : 10;

        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = posts.Select(p => new ForumPostDto
        {
            PostId = p.PostId,
            TopicId = p.TopicId,
            TopicName = p.Topic?.Name ?? "Chung",
            TopicSlug = p.Topic?.Slug ?? "",
            AuthorId = p.AuthorId,
            AuthorName = p.Author?.FullName ?? "Học viên",
            AuthorEmail = p.Author?.Email,
            AuthorAvatar = p.Author?.AvatarUrl,
            AuthorRole = p.Author?.Role?.RoleName ?? "Student",
            Title = p.Title,
            Content = p.Content,
            ImageUrl = p.ImageUrl,
            ViewsCount = p.ViewsCount,
            ReactionsCount = p.ReactionsCount,
            CommentsCount = p.CommentsCount,
            ReportsCount = p.ReportsCount,
            Status = p.Status,
            IsPinned = p.IsPinned,
            IsLocked = p.IsLocked,
            IsAnonymous = p.IsAnonymous,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        }).ToList();

        return new PaginatedResult<ForumPostDto>(items, totalItems, page, limit);
    }

    public async Task<bool> ResolveReportAsync(int reportId, int adminId, string action)
    {
        var report = await _context.ForumReports.FirstOrDefaultAsync(r => r.ReportId == reportId);
        if (report is null) return false;

        report.Status = action.ToUpper() == "DISMISS" ? "DISMISSED" : "RESOLVED";
        report.ResolvedAt = DateTime.UtcNow;
        report.ResolvedById = adminId;

        if (action.ToUpper() == "HIDE")
        {
            if (report.TargetType == "POST" && report.PostId.HasValue)
            {
                await UpdatePostStatusAsync(report.PostId.Value, adminId, "HIDDEN_BY_ADMIN");
            }
            else if (report.TargetType == "COMMENT" && report.CommentId.HasValue)
            {
                await UpdateCommentStatusAsync(report.CommentId.Value, adminId, "HIDDEN_BY_ADMIN");
            }
        }
        else if (action.ToUpper() == "DELETE")
        {
            if (report.TargetType == "POST" && report.PostId.HasValue)
            {
                await UpdatePostStatusAsync(report.PostId.Value, adminId, "DELETED");
            }
            else if (report.TargetType == "COMMENT" && report.CommentId.HasValue)
            {
                await UpdateCommentStatusAsync(report.CommentId.Value, adminId, "DELETED");
            }
        }

        _context.ForumReports.Update(report);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestorePostAsync(int postId, int adminId)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);
        if (post is null) return false;

        post.Status = "PUBLISHED";
        post.RestoredAt = DateTime.UtcNow; // Record restore timestamp!
        post.ReportsCount = 0; // Reset active reports counter
        post.UpdatedAt = DateTime.UtcNow;

        _context.ForumPosts.Update(post);

        // Mark all pending reports for this post as RESOLVED so old reports don't trigger auto-hide again
        var pendingReports = await _context.ForumReports
            .Where(r => r.TargetType == "POST" && r.PostId == postId && r.Status == "PENDING")
            .ToListAsync();

        foreach (var r in pendingReports)
        {
            r.Status = "RESOLVED";
            r.ResolvedAt = DateTime.UtcNow;
            r.ResolvedById = adminId;
        }

        _context.ForumReports.UpdateRange(pendingReports);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdatePostStatusAsync(int postId, int adminId, string status)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);
        if (post is null) return false;

        post.Status = status.ToUpper();
        post.UpdatedAt = DateTime.UtcNow;

        _context.ForumPosts.Update(post);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreCommentAsync(int commentId, int adminId)
    {
        var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (comment is null) return false;

        comment.Status = "ACTIVE";
        comment.RestoredAt = DateTime.UtcNow; // Record restore timestamp!
        comment.ReportsCount = 0; // Reset active reports counter
        comment.UpdatedAt = DateTime.UtcNow;

        _context.ForumComments.Update(comment);

        // Mark all pending reports for this comment as RESOLVED
        var pendingReports = await _context.ForumReports
            .Where(r => r.TargetType == "COMMENT" && r.CommentId == commentId && r.Status == "PENDING")
            .ToListAsync();

        foreach (var r in pendingReports)
        {
            r.Status = "RESOLVED";
            r.ResolvedAt = DateTime.UtcNow;
            r.ResolvedById = adminId;
        }

        _context.ForumReports.UpdateRange(pendingReports);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateCommentStatusAsync(int commentId, int adminId, string status)
    {
        var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (comment is null) return false;

        comment.Status = status.ToUpper();
        comment.UpdatedAt = DateTime.UtcNow;

        _context.ForumComments.Update(comment);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ForumTopicDto> CreateTopicAsync(CreateForumTopicDto request)
    {
        var slug = !string.IsNullOrWhiteSpace(request.Slug)
            ? request.Slug.Trim().ToLower()
            : request.Name.Trim().ToLower().Replace(" ", "-");

        var topic = new ForumTopic
        {
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description?.Trim(),
            Icon = request.Icon?.Trim() ?? "MessageSquare",
            OrderIndex = request.OrderIndex,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };

        _context.ForumTopics.Add(topic);
        await _context.SaveChangesAsync();

        return new ForumTopicDto
        {
            TopicId = topic.TopicId,
            Name = topic.Name,
            Slug = topic.Slug,
            Description = topic.Description,
            Icon = topic.Icon,
            OrderIndex = topic.OrderIndex,
            PostsCount = 0
        };
    }

    public async Task<ForumTopicDto?> UpdateTopicAsync(int topicId, CreateForumTopicDto request)
    {
        var topic = await _context.ForumTopics.FirstOrDefaultAsync(t => t.TopicId == topicId);
        if (topic is null) return null;

        topic.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Slug))
        {
            topic.Slug = request.Slug.Trim().ToLower();
        }
        topic.Description = request.Description?.Trim();
        topic.Icon = request.Icon?.Trim();
        topic.OrderIndex = request.OrderIndex;

        _context.ForumTopics.Update(topic);
        await _context.SaveChangesAsync();

        return new ForumTopicDto
        {
            TopicId = topic.TopicId,
            Name = topic.Name,
            Slug = topic.Slug,
            Description = topic.Description,
            Icon = topic.Icon,
            OrderIndex = topic.OrderIndex,
            PostsCount = await _context.ForumPosts.CountAsync(p => p.TopicId == topicId && p.Status == "PUBLISHED")
        };
    }

    public async Task<bool> DeleteTopicAsync(int topicId)
    {
        var topic = await _context.ForumTopics.FirstOrDefaultAsync(t => t.TopicId == topicId);
        if (topic is null) return false;

        topic.Status = "INACTIVE";
        _context.ForumTopics.Update(topic);
        await _context.SaveChangesAsync();
        return true;
    }
}
