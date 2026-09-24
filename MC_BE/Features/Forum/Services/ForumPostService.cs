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

public class ForumPostService : IForumPostService
{
    private readonly SmartMcDbContext _context;

    public ForumPostService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<List<ForumTopicDto>> GetTopicsAsync()
    {
        var topics = await _context.ForumTopics
            .Where(t => t.Status == "ACTIVE")
            .OrderBy(t => t.OrderIndex)
            .Select(t => new ForumTopicDto
            {
                TopicId = t.TopicId,
                Name = t.Name,
                Slug = t.Slug,
                Description = t.Description,
                Icon = t.Icon,
                OrderIndex = t.OrderIndex,
                PostsCount = t.Posts.Count(p => p.Status == "PUBLISHED")
            })
            .ToListAsync();

        if (!topics.Any())
        {
            // Seed initial topics if DB is empty
            var defaultTopics = new List<ForumTopic>
            {
                new ForumTopic { Name = "Thảo luận chung", Slug = "thao-luan-chung", Description = "Trao đổi các chủ đề chung về MC và diễn xuất", Icon = "MessageSquare", OrderIndex = 1 },
                new ForumTopic { Name = "Kỹ năng & Mẹo MC", Slug = "ky-nang-meo-mc", Description = "Chia sẻ kinh nghiệm làm chủ sân khấu, giọng nói", Icon = "Mic", OrderIndex = 2 },
                new ForumTopic { Name = "Hỏi đáp khóa học", Slug = "hoi-dap-khoa-hoc", Description = "Giải đáp thắc mắc về nội dung các bài học", Icon = "HelpCircle", OrderIndex = 3 },
                new ForumTopic { Name = "Góc tuyển dụng & Show", Slug = "tuyen-dung-show", Description = "Cơ hội việc làm, tìm bạn đồng hành, tìm show", Icon = "Briefcase", OrderIndex = 4 }
            };

            _context.ForumTopics.AddRange(defaultTopics);
            await _context.SaveChangesAsync();

            return defaultTopics.Select(t => new ForumTopicDto
            {
                TopicId = t.TopicId,
                Name = t.Name,
                Slug = t.Slug,
                Description = t.Description,
                Icon = t.Icon,
                OrderIndex = t.OrderIndex,
                PostsCount = 0
            }).ToList();
        }

        return topics;
    }

    public async Task<PaginatedResult<ForumPostDto>> GetPostsAsync(PostQueryParameters query, int? currentUserId, bool isAdmin)
    {
        var baseQuery = _context.ForumPosts
            .Include(p => p.Topic)
            .Include(p => p.Author).ThenInclude(a => a.Role)
            .AsNoTracking();

        // Filter hidden/deleted posts:
        // - Admin sees everything except DELETED.
        // - Author sees their own PUBLISHED or HIDDEN posts.
        // - Public users only see PUBLISHED.
        if (!isAdmin)
        {
            if (currentUserId.HasValue)
            {
                baseQuery = baseQuery.Where(p => p.Status == "PUBLISHED" || (p.AuthorId == currentUserId.Value && p.Status != "DELETED"));
            }
            else
            {
                baseQuery = baseQuery.Where(p => p.Status == "PUBLISHED");
            }
        }
        else
        {
            baseQuery = baseQuery.Where(p => p.Status != "DELETED");
        }

        // Filter by Topic
        if (query.TopicId.HasValue && query.TopicId.Value > 0)
        {
            baseQuery = baseQuery.Where(p => p.TopicId == query.TopicId.Value);
        }

        // Search in Title or Content
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            baseQuery = baseQuery.Where(p => p.Title.ToLower().Contains(search) || p.Content.ToLower().Contains(search));
        }

        // Sorting
        baseQuery = query.SortBy.ToLower() switch
        {
            "hot" => baseQuery.OrderByDescending(p => p.IsPinned).ThenByDescending(p => p.ReactionsCount + p.CommentsCount),
            "most_commented" => baseQuery.OrderByDescending(p => p.IsPinned).ThenByDescending(p => p.CommentsCount),
            _ => baseQuery.OrderByDescending(p => p.IsPinned).ThenByDescending(p => p.CreatedAt)
        };

        var totalItems = await baseQuery.CountAsync();
        var page = query.Page > 0 ? query.Page : 1;
        var limit = query.Limit > 0 ? query.Limit : 10;

        var posts = await baseQuery
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        // Get user reactions and reports for the fetched posts
        var postIds = posts.Select(p => p.PostId).ToList();
        var userReactions = new Dictionary<int, string>();
        var userReports = new HashSet<int>();

        if (currentUserId.HasValue && postIds.Any())
        {
            userReactions = await _context.ForumReactions
                .Where(r => r.UserId == currentUserId.Value && r.TargetType == "POST" && r.PostId.HasValue && postIds.Contains(r.PostId.Value))
                .ToDictionaryAsync(r => r.PostId!.Value, r => r.ReactionType);

            userReports = (await _context.ForumReports
                .Where(r => r.ReporterId == currentUserId.Value && r.TargetType == "POST" && r.PostId.HasValue && postIds.Contains(r.PostId.Value))
                .Select(r => r.PostId!.Value)
                .ToListAsync()).ToHashSet();
        }

        var items = posts.Select(p =>
        {
            int authorId = p.AuthorId;
            string authorName = p.Author?.FullName ?? "Học viên";
            string? authorAvatar = p.Author?.AvatarUrl;
            string authorRole = p.Author?.Role?.RoleName ?? "Learner";

            if (p.IsAnonymous && !isAdmin)
            {
                authorId = 0;
                authorName = "Học viên ẩn danh";
                authorAvatar = null;
                authorRole = "Learner";
            }

            return new ForumPostDto
            {
                PostId = p.PostId,
                TopicId = p.TopicId,
                TopicName = p.Topic?.Name ?? "Chung",
                TopicSlug = p.Topic?.Slug ?? "thao-luan-chung",
                AuthorId = authorId,
                AuthorName = authorName,
                AuthorAvatar = authorAvatar,
                AuthorRole = authorRole,
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
                UpdatedAt = p.UpdatedAt,
                UserReaction = userReactions.GetValueOrDefault(p.PostId),
                UserHasReported = userReports.Contains(p.PostId),
                IsAuthor = currentUserId.HasValue && p.AuthorId == currentUserId.Value
            };
        }).ToList();

        return new PaginatedResult<ForumPostDto>(items, totalItems, page, limit);
    }

    public async Task<ForumPostDto?> GetPostByIdAsync(int postId, int? currentUserId, bool isAdmin)
    {
        var post = await _context.ForumPosts
            .Include(p => p.Topic)
            .Include(p => p.Author).ThenInclude(a => a.Role)
            .FirstOrDefaultAsync(p => p.PostId == postId);

        if (post is null || post.Status == "DELETED")
            return null;

        // Permission check for hidden post:
        if (post.Status != "PUBLISHED" && !isAdmin && (!currentUserId.HasValue || currentUserId.Value != post.AuthorId))
        {
            return null; // Not allowed to view hidden post
        }

        // Increment view count
        post.ViewsCount += 1;
        await _context.SaveChangesAsync();

        string? userReaction = null;
        bool userHasReported = false;

        if (currentUserId.HasValue)
        {
            userReaction = await _context.ForumReactions
                .Where(r => r.UserId == currentUserId.Value && r.TargetType == "POST" && r.PostId == postId)
                .Select(r => r.ReactionType)
                .FirstOrDefaultAsync();

            userHasReported = await _context.ForumReports
                .AnyAsync(r => r.ReporterId == currentUserId.Value && r.TargetType == "POST" && r.PostId == postId);
        }

        int authorId = post.AuthorId;
        string authorName = post.Author?.FullName ?? "Học viên";
        string? authorAvatar = post.Author?.AvatarUrl;
        string authorRole = post.Author?.Role?.RoleName ?? "Learner";

        if (post.IsAnonymous && !isAdmin)
        {
            authorId = 0;
            authorName = "Học viên ẩn danh";
            authorAvatar = null;
            authorRole = "Learner";
        }

        return new ForumPostDto
        {
            PostId = post.PostId,
            TopicId = post.TopicId,
            TopicName = post.Topic?.Name ?? "Chung",
            TopicSlug = post.Topic?.Slug ?? "thao-luan-chung",
            AuthorId = authorId,
            AuthorName = authorName,
            AuthorAvatar = authorAvatar,
            AuthorRole = authorRole,
            Title = post.Title,
            Content = post.Content,
            ImageUrl = post.ImageUrl,
            ViewsCount = post.ViewsCount,
            ReactionsCount = post.ReactionsCount,
            CommentsCount = post.CommentsCount,
            ReportsCount = post.ReportsCount,
            Status = post.Status,
            IsPinned = post.IsPinned,
            IsLocked = post.IsLocked,
            IsAnonymous = post.IsAnonymous,
            CreatedAt = post.CreatedAt,
            UpdatedAt = post.UpdatedAt,
            UserReaction = userReaction,
            UserHasReported = userHasReported,
            IsAuthor = currentUserId.HasValue && post.AuthorId == currentUserId.Value
        };
    }

    public async Task<ForumPostDto> CreatePostAsync(int authorId, CreatePostRequest request)
    {
        var topicExists = await _context.ForumTopics.AnyAsync(t => t.TopicId == request.TopicId);
        if (!topicExists)
        {
            throw new InvalidOperationException("Chủ đề diễn đàn không tồn tại.");
        }

        var post = new ForumPost
        {
            TopicId = request.TopicId,
            AuthorId = authorId,
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            ImageUrl = request.ImageUrl?.Trim(),
            IsAnonymous = request.IsAnonymous,
            Status = "PUBLISHED",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ForumPosts.Add(post);
        await _context.SaveChangesAsync();

        return (await GetPostByIdAsync(post.PostId, authorId, false))!;
    }

    public async Task<ForumPostDto?> UpdatePostAsync(int postId, int userId, UpdatePostRequest request)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);
        if (post is null || post.Status == "DELETED")
            return null;

        if (post.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa bài viết của người khác.");
        }

        if (post.Status != "PUBLISHED")
        {
            throw new InvalidOperationException("Bài viết đang trong trạng thái tạm ẩn, không thể chỉnh sửa.");
        }

        post.TopicId = request.TopicId;
        post.Title = request.Title.Trim();
        post.Content = request.Content.Trim();
        post.ImageUrl = request.ImageUrl?.Trim();
        post.IsAnonymous = request.IsAnonymous;
        post.UpdatedAt = DateTime.UtcNow;

        _context.ForumPosts.Update(post);
        await _context.SaveChangesAsync();

        return await GetPostByIdAsync(postId, userId, false);
    }

    public async Task<bool> DeletePostAsync(int postId, int userId, bool isAdmin)
    {
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);
        if (post is null || post.Status == "DELETED")
            return false;

        if (!isAdmin && post.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xóa bài viết của người khác.");
        }

        post.Status = "DELETED";
        post.UpdatedAt = DateTime.UtcNow;

        _context.ForumPosts.Update(post);
        await _context.SaveChangesAsync();
        return true;
    }
}
