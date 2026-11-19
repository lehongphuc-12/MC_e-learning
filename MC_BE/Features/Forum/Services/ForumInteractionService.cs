using System;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Forum.Services;

public class ForumInteractionService : IForumInteractionService
{
    private readonly SmartMcDbContext _context;

    public ForumInteractionService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<ForumReactionSummaryDto> ToggleReactionAsync(int userId, ToggleReactionRequest request)
    {
        var targetType = request.TargetType.ToUpper();
        if (targetType != "POST" && targetType != "COMMENT")
        {
            throw new InvalidOperationException("Loại tương tác không hợp lệ. Phải là POST hoặc COMMENT.");
        }

        if (targetType == "POST")
        {
            if (!request.PostId.HasValue || request.PostId.Value <= 0)
                throw new InvalidOperationException("Thiếu ID bài viết.");

            var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == request.PostId.Value);
            if (post is null || post.Status == "DELETED")
                throw new InvalidOperationException("Bài viết không tồn tại.");

            if (post.Status != "PUBLISHED")
                throw new InvalidOperationException("Bài viết đang trong trạng thái tạm ẩn, không thể thả tương tác.");

            var existingReaction = await _context.ForumReactions
                .FirstOrDefaultAsync(r => r.UserId == userId && r.TargetType == "POST" && r.PostId == request.PostId.Value);

            bool isReacted = false;
            string? currentType = null;

            if (existingReaction != null)
            {
                if (existingReaction.ReactionType.Equals(request.ReactionType, StringComparison.OrdinalIgnoreCase))
                {
                    // Toggle OFF (remove reaction)
                    _context.ForumReactions.Remove(existingReaction);
                    post.ReactionsCount = Math.Max(0, post.ReactionsCount - 1);
                }
                else
                {
                    // Switch reaction type
                    existingReaction.ReactionType = request.ReactionType.ToUpper();
                    _context.ForumReactions.Update(existingReaction);
                    isReacted = true;
                    currentType = existingReaction.ReactionType;
                }
            }
            else
            {
                // Add new reaction
                var newReaction = new ForumReaction
                {
                    UserId = userId,
                    TargetType = "POST",
                    PostId = request.PostId.Value,
                    ReactionType = request.ReactionType.ToUpper(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.ForumReactions.Add(newReaction);
                post.ReactionsCount += 1;
                isReacted = true;
                currentType = newReaction.ReactionType;
            }

            _context.ForumPosts.Update(post);
            await _context.SaveChangesAsync();

            return new ForumReactionSummaryDto
            {
                IsReacted = isReacted,
                ReactionType = currentType,
                TotalReactions = post.ReactionsCount
            };
        }
        else
        {
            if (!request.CommentId.HasValue || request.CommentId.Value <= 0)
                throw new InvalidOperationException("Thiếu ID bình luận.");

            var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == request.CommentId.Value);
            if (comment is null || comment.Status == "DELETED")
                throw new InvalidOperationException("Bình luận không tồn tại.");

            if (comment.Status != "ACTIVE")
                throw new InvalidOperationException("Bình luận đang trong trạng thái tạm ẩn, không thể thả tương tác.");

            var existingReaction = await _context.ForumReactions
                .FirstOrDefaultAsync(r => r.UserId == userId && r.TargetType == "COMMENT" && r.CommentId == request.CommentId.Value);

            bool isReacted = false;
            string? currentType = null;

            if (existingReaction != null)
            {
                if (existingReaction.ReactionType.Equals(request.ReactionType, StringComparison.OrdinalIgnoreCase))
                {
                    // Toggle OFF
                    _context.ForumReactions.Remove(existingReaction);
                    comment.ReactionsCount = Math.Max(0, comment.ReactionsCount - 1);
                }
                else
                {
                    // Switch reaction type
                    existingReaction.ReactionType = request.ReactionType.ToUpper();
                    _context.ForumReactions.Update(existingReaction);
                    isReacted = true;
                    currentType = existingReaction.ReactionType;
                }
            }
            else
            {
                // Add new reaction
                var newReaction = new ForumReaction
                {
                    UserId = userId,
                    TargetType = "COMMENT",
                    CommentId = request.CommentId.Value,
                    ReactionType = request.ReactionType.ToUpper(),
                    CreatedAt = DateTime.UtcNow
                };

                _context.ForumReactions.Add(newReaction);
                comment.ReactionsCount += 1;
                isReacted = true;
                currentType = newReaction.ReactionType;
            }

            _context.ForumComments.Update(comment);
            await _context.SaveChangesAsync();

            return new ForumReactionSummaryDto
            {
                IsReacted = isReacted,
                ReactionType = currentType,
                TotalReactions = comment.ReactionsCount
            };
        }
    }

    public async Task<bool> CreateReportAsync(int reporterId, CreateReportRequest request)
    {
        var targetType = request.TargetType.ToUpper();
        if (targetType != "POST" && targetType != "COMMENT")
        {
            throw new InvalidOperationException("Loại báo cáo không hợp lệ. Phải là POST hoặc COMMENT.");
        }

        if (targetType == "POST")
        {
            if (!request.PostId.HasValue || request.PostId.Value <= 0)
                throw new InvalidOperationException("Thiếu ID bài viết.");

            var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == request.PostId.Value);
            if (post is null || post.Status == "DELETED")
                throw new InvalidOperationException("Bài viết không tồn tại.");

            // RULE: Author cannot self-report their own post!
            if (post.AuthorId == reporterId)
            {
                throw new InvalidOperationException("Bạn không thể báo cáo bài viết của chính mình.");
            }

            if (post.Status != "PUBLISHED")
            {
                throw new InvalidOperationException("Bài viết này đã ở trạng thái tạm ẩn hoặc chờ duyệt.");
            }

            // RULE: Each user can only report once
            var hasReported = await _context.ForumReports
                .AnyAsync(r => r.ReporterId == reporterId && r.TargetType == "POST" && r.PostId == request.PostId.Value);

            if (hasReported)
            {
                throw new InvalidOperationException("Bạn đã báo cáo bài viết này trước đây.");
            }

            var report = new ForumReport
            {
                ReporterId = reporterId,
                TargetType = "POST",
                PostId = request.PostId.Value,
                Reason = request.Reason.ToUpper(),
                Details = request.Details?.Trim(),
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow
            };

            _context.ForumReports.Add(report);

            // Count unique reports submitted after the last RestoredAt timestamp (or CreatedAt if never restored)
            var thresholdDate = post.RestoredAt ?? post.CreatedAt;
            var recentReportsCount = await _context.ForumReports
                .CountAsync(r => r.TargetType == "POST" && r.PostId == request.PostId.Value && r.CreatedAt >= thresholdDate && r.Status == "PENDING") + 1;

            post.ReportsCount = recentReportsCount;

            // AUTO-HIDE TRIGGER: If 5 unique reports reached -> Auto-hide post!
            if (recentReportsCount >= 5)
            {
                post.Status = "HIDDEN_BY_REPORTS";
                post.UpdatedAt = DateTime.UtcNow;
            }

            _context.ForumPosts.Update(post);
            await _context.SaveChangesAsync();
            return true;
        }
        else
        {
            if (!request.CommentId.HasValue || request.CommentId.Value <= 0)
                throw new InvalidOperationException("Thiếu ID bình luận.");

            var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == request.CommentId.Value);
            if (comment is null || comment.Status == "DELETED")
                throw new InvalidOperationException("Bình luận không tồn tại.");

            // RULE: Author cannot self-report their own comment!
            if (comment.AuthorId == reporterId)
            {
                throw new InvalidOperationException("Bạn không thể báo cáo bình luận của chính mình.");
            }

            if (comment.Status != "ACTIVE")
            {
                throw new InvalidOperationException("Bình luận này đã ở trạng thái tạm ẩn hoặc chờ duyệt.");
            }

            // RULE: Each user can only report once
            var hasReported = await _context.ForumReports
                .AnyAsync(r => r.ReporterId == reporterId && r.TargetType == "COMMENT" && r.CommentId == request.CommentId.Value);

            if (hasReported)
            {
                throw new InvalidOperationException("Bạn đã báo cáo bình luận này trước đây.");
            }

            var report = new ForumReport
            {
                ReporterId = reporterId,
                TargetType = "COMMENT",
                CommentId = request.CommentId.Value,
                Reason = request.Reason.ToUpper(),
                Details = request.Details?.Trim(),
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow
            };

            _context.ForumReports.Add(report);

            // Count unique reports submitted after the last RestoredAt timestamp
            var thresholdDate = comment.RestoredAt ?? comment.CreatedAt;
            var recentReportsCount = await _context.ForumReports
                .CountAsync(r => r.TargetType == "COMMENT" && r.CommentId == request.CommentId.Value && r.CreatedAt >= thresholdDate && r.Status == "PENDING") + 1;

            comment.ReportsCount = recentReportsCount;

            // AUTO-HIDE TRIGGER: If 5 unique reports reached -> Auto-hide comment!
            if (recentReportsCount >= 5)
            {
                comment.Status = "HIDDEN_BY_REPORTS";
                comment.UpdatedAt = DateTime.UtcNow;
            }

            _context.ForumComments.Update(comment);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
