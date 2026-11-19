using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Forum.Services;

public class ForumCommentService : IForumCommentService
{
    private readonly SmartMcDbContext _context;

    public ForumCommentService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<List<ForumCommentDto>> GetCommentsByPostIdAsync(int postId, int? currentUserId, bool isAdmin)
    {
        var comments = await _context.ForumComments
            .Include(c => c.Author).ThenInclude(a => a.Role)
            .Where(c => c.PostId == postId && c.Status != "DELETED")
            .AsNoTracking()
            .ToListAsync();

        var commentIds = comments.Select(c => c.CommentId).ToList();
        var userReactions = new Dictionary<int, string>();
        var userReports = new HashSet<int>();

        if (currentUserId.HasValue && commentIds.Any())
        {
            userReactions = await _context.ForumReactions
                .Where(r => r.UserId == currentUserId.Value && r.TargetType == "COMMENT" && r.CommentId.HasValue && commentIds.Contains(r.CommentId.Value))
                .ToDictionaryAsync(r => r.CommentId!.Value, r => r.ReactionType);

            userReports = (await _context.ForumReports
                .Where(r => r.ReporterId == currentUserId.Value && r.TargetType == "COMMENT" && r.CommentId.HasValue && commentIds.Contains(r.CommentId.Value))
                .Select(r => r.CommentId!.Value)
                .ToListAsync()).ToHashSet();
        }

        // Map comment to DTO with API Anonymity Masking & Hidden Status check
        ForumCommentDto MapToDto(ForumComment c)
        {
            bool isAuthor = currentUserId.HasValue && c.AuthorId == currentUserId.Value;

            // API Anonymity Masking: If anonymous and viewer is not admin, mask author details completely
            int authorId = c.AuthorId;
            string authorName = c.Author?.FullName ?? "Học viên";
            string? authorAvatar = c.Author?.AvatarUrl;
            string authorRole = c.Author?.Role?.RoleName ?? "Learner";

            if (c.IsAnonymous && !isAdmin)
            {
                authorId = 0;
                authorName = "Học viên ẩn danh";
                authorAvatar = null;
                authorRole = "Learner";
            }

            // Hidden comment content masking for non-author & non-admin
            string displayContent = c.Content;
            if (c.Status != "ACTIVE" && !isAdmin && !isAuthor)
            {
                displayContent = "[Bình luận này đang bị ẩn do vi phạm quy chuẩn]";
            }

            return new ForumCommentDto
            {
                CommentId = c.CommentId,
                PostId = c.PostId,
                AuthorId = authorId,
                AuthorName = authorName,
                AuthorAvatar = authorAvatar,
                AuthorRole = authorRole,
                ParentCommentId = c.ParentCommentId,
                DepthLevel = c.DepthLevel,
                Content = displayContent,
                ImageUrl = c.ImageUrl,
                IsAnonymous = c.IsAnonymous,
                ReactionsCount = c.ReactionsCount,
                ReportsCount = c.ReportsCount,
                Status = c.Status,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                UserReaction = userReactions.GetValueOrDefault(c.CommentId),
                UserHasReported = userReports.Contains(c.CommentId),
                IsAuthor = isAuthor
            };
        }

        var allDtos = comments.Select(MapToDto).ToList();

        // Organize into 2-level hierarchy: Level 1 comments with Replies list
        var topLevelComments = allDtos
            .Where(c => c.ParentCommentId == null || c.DepthLevel == 1)
            .OrderBy(c => c.CreatedAt)
            .ToList();

        var repliesMap = allDtos
            .Where(c => c.ParentCommentId.HasValue && c.DepthLevel == 2)
            .GroupBy(c => c.ParentCommentId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderBy(r => r.CreatedAt).ToList());

        foreach (var parent in topLevelComments)
        {
            if (repliesMap.TryGetValue(parent.CommentId, out var replies))
            {
                parent.Replies = replies;
            }
        }

        return topLevelComments;
    }

    public async Task<ForumCommentDto> AddCommentAsync(int authorId, CreateCommentRequest request)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == request.PostId);
        if (post is null || post.Status == "DELETED")
        {
            throw new InvalidOperationException("Bài viết không tồn tại.");
        }

        if (post.Status != "PUBLISHED")
        {
            throw new InvalidOperationException("Bài viết đang trong trạng thái bị ẩn, không thể bình luận.");
        }

        if (post.IsLocked)
        {
            throw new InvalidOperationException("Bài viết này đã bị khóa bình luận.");
        }

        int depthLevel = 1;
        int? parentCommentId = null;

        if (request.ParentCommentId.HasValue && request.ParentCommentId.Value > 0)
        {
            var parent = await _context.ForumComments
                .FirstOrDefaultAsync(c => c.CommentId == request.ParentCommentId.Value && c.PostId == request.PostId);

            if (parent is null || parent.Status == "DELETED")
            {
                throw new InvalidOperationException("Bình luận cha không tồn tại.");
            }

            // If replying to a Level 2 comment, link to top-level parent comment so depth remains 2 (same indent level)
            parentCommentId = parent.ParentCommentId ?? parent.CommentId;
            depthLevel = 2;
        }

        var comment = new ForumComment
        {
            PostId = request.PostId,
            AuthorId = authorId,
            ParentCommentId = parentCommentId,
            DepthLevel = depthLevel,
            Content = request.Content.Trim(),
            ImageUrl = request.ImageUrl?.Trim(),
            IsAnonymous = request.IsAnonymous,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ForumComments.Add(comment);

        // Increment post comments count
        post.CommentsCount += 1;
        _context.ForumPosts.Update(post);

        await _context.SaveChangesAsync();

        var author = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == authorId);

        int returnAuthorId = authorId;
        string returnAuthorName = author?.FullName ?? "Học viên";
        string? returnAuthorAvatar = author?.AvatarUrl;
        string returnAuthorRole = author?.Role?.RoleName ?? "Learner";

        if (comment.IsAnonymous)
        {
            returnAuthorId = 0;
            returnAuthorName = "Học viên ẩn danh";
            returnAuthorAvatar = null;
            returnAuthorRole = "Learner";
        }

        return new ForumCommentDto
        {
            CommentId = comment.CommentId,
            PostId = comment.PostId,
            AuthorId = returnAuthorId,
            AuthorName = returnAuthorName,
            AuthorAvatar = returnAuthorAvatar,
            AuthorRole = returnAuthorRole,
            ParentCommentId = comment.ParentCommentId,
            DepthLevel = comment.DepthLevel,
            Content = comment.Content,
            ImageUrl = comment.ImageUrl,
            IsAnonymous = comment.IsAnonymous,
            ReactionsCount = 0,
            ReportsCount = 0,
            Status = comment.Status,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt,
            UserReaction = null,
            UserHasReported = false,
            IsAuthor = true
        };
    }

    public async Task<ForumCommentDto?> UpdateCommentAsync(int commentId, int userId, UpdateCommentRequest request)
    {
        var comment = await _context.ForumComments
            .Include(c => c.Author).ThenInclude(a => a.Role)
            .FirstOrDefaultAsync(c => c.CommentId == commentId);

        if (comment is null || comment.Status == "DELETED")
            return null;

        if (comment.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa bình luận của người khác.");
        }

        if (comment.Status != "ACTIVE")
        {
            throw new InvalidOperationException("Bình luận đang trong trạng thái bị ẩn, không thể chỉnh sửa.");
        }

        comment.Content = request.Content.Trim();
        comment.ImageUrl = request.ImageUrl?.Trim();
        comment.IsAnonymous = request.IsAnonymous;
        comment.UpdatedAt = DateTime.UtcNow;

        _context.ForumComments.Update(comment);
        await _context.SaveChangesAsync();

        int returnAuthorId = comment.AuthorId;
        string returnAuthorName = comment.Author?.FullName ?? "Học viên";
        string? returnAuthorAvatar = comment.Author?.AvatarUrl;
        string returnAuthorRole = comment.Author?.Role?.RoleName ?? "Learner";

        if (comment.IsAnonymous)
        {
            returnAuthorId = 0;
            returnAuthorName = "Học viên ẩn danh";
            returnAuthorAvatar = null;
            returnAuthorRole = "Learner";
        }

        return new ForumCommentDto
        {
            CommentId = comment.CommentId,
            PostId = comment.PostId,
            AuthorId = returnAuthorId,
            AuthorName = returnAuthorName,
            AuthorAvatar = returnAuthorAvatar,
            AuthorRole = returnAuthorRole,
            ParentCommentId = comment.ParentCommentId,
            DepthLevel = comment.DepthLevel,
            Content = comment.Content,
            ImageUrl = comment.ImageUrl,
            IsAnonymous = comment.IsAnonymous,
            ReactionsCount = comment.ReactionsCount,
            ReportsCount = comment.ReportsCount,
            Status = comment.Status,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt,
            IsAuthor = true
        };
    }

    public async Task<bool> DeleteCommentAsync(int commentId, int userId, bool isAdmin)
    {
        var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (comment is null || comment.Status == "DELETED")
            return false;

        if (!isAdmin && comment.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xóa bình luận của người khác.");
        }

        comment.Status = "DELETED";
        comment.UpdatedAt = DateTime.UtcNow;

        _context.ForumComments.Update(comment);

        // Decrement post comments count
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == comment.PostId);
        if (post != null && post.CommentsCount > 0)
        {
            post.CommentsCount -= 1;
            _context.ForumPosts.Update(post);
        }

        await _context.SaveChangesAsync();
        return true;
    }
}
