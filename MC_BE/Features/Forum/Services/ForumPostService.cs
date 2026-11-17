// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Business Logic Layer / Application Service Implementation.
// - Nằm trong module: Features/Forum/Services.
// - Hiện thực (Implements): Giao diện IForumPostService.
// - Vai trò: Trọng tâm của module Diễn đàn, quản lý toàn bộ vòng đời bài viết (Forum Posts), danh mục chủ đề (Topics),
//   và hồ sơ hoạt động cộng đồng của thành viên (Forum User Profile).
// - Nguyên lý: Đóng gói chặt chẽ các chính sách truy xuất dữ liệu phân quyền (Role-Based Visibility), cơ chế sắp xếp đa tiêu chí
//   (Ghim ưu tiên, Điểm nóng Hot, Số lượng thảo luận), bảo mật ẩn danh (Anonymity Masking), và tự động tăng lượt xem (Views Tracking).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Tạo sân chơi chia sẻ kinh nghiệm, kết nối nghề nghiệp và hỏi đáp chuyên môn cho cộng đồng MC MSEEK:
//   1. Khởi tạo dữ liệu mẫu tự động (Self-Seeding Topics): Nếu hệ thống mới dựng chưa có chủ đề, tự động sinh 4 chủ đề chuẩn
//      (Thảo luận chung, Kỹ năng & Mẹo MC, Hỏi đáp khóa học, Góc tuyển dụng & Show).
//   2. Phân quyền hiển thị bài viết theo 3 cấp độ bảo mật (Visibility Matrix):
//      - Người dùng vãng lai / Học viên khác: CHỈ xem được các bài viết công khai (Status == "PUBLISHED").
//      - Tác giả bài viết: Xem được bài của chính mình kể cả khi đang bị tạm ẩn kiểm duyệt (Status == "HIDDEN").
//      - Quản trị viên (Admin): Xem được tất cả bài viết ngoại trừ các bài đã xóa mềm (Status != "DELETED").
//   3. Cơ chế sắp xếp thông minh: Bài viết được Ghim (IsPinned = true) luôn luôn đứng đầu danh sách, sau đó mới đến các tiêu chí:
//      Mới nhất (Latest - CreatedAt), Nổi bật (Hot - Tổng Reactions + Comments), hoặc Nhiều bình luận nhất (Most Commented).
//   4. Đăng bài ẩn danh (Anonymous Posting): Cho phép học viên thoải mái đặt câu hỏi tế nhị mà không sợ lộ danh tính với học viên khác.
//   5. Thống kê hoạt động cá nhân (User Profile Metrics): Đếm tổng số bài viết và bình luận đã đóng góp của từng thành viên.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: ForumPostsController tiếp nhận request và gọi sang ForumPostService.
// - Service: ForumPostService thao tác trên SmartMcDbContext với các bảng ForumTopics, ForumPosts, ForumComments, ForumReactions, ForumReports, Users.
// ====================================================================================================

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

/// <summary>
/// Lớp triển khai các nghiệp vụ quản lý bài viết, chủ đề thảo luận và hồ sơ thành viên diễn đàn MSEEK.
/// </summary>
public class ForumPostService : IForumPostService
{
    // [Giải phẫu Dependency Field]:
    // - private readonly SmartMcDbContext _context: Quản lý phiên làm việc với cơ sở dữ liệu.
    private readonly SmartMcDbContext _context;

    /// <summary>
    /// Khởi tạo Service với DbContext được inject từ DI Container.
    /// </summary>
    /// <param name="context">DbContext kết nối cơ sở dữ liệu.</param>
    public ForumPostService(SmartMcDbContext context)
    {
        // [Dòng này làm gì]: Gán DbContext vào biến nội bộ của class.
        _context = context;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách toàn bộ chủ đề thảo luận đang hoạt động, tự động seed dữ liệu mẫu nếu CSDL rỗng.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Truy vấn danh sách ForumTopics có Status == ACTIVE, sắp xếp theo OrderIndex tăng dần.</para>
    /// <para>Bước 2: Tính số lượng bài viết đang PUBLISHED thuộc từng chủ đề qua phép đếm Posts.Count.</para>
    /// <para>Bước 3: Rẽ nhánh kiểm tra: Nếu CSDL chưa có chủ đề nào (!topics.Any()) -> Tự động nạp 4 chủ đề mặc định.</para>
    /// <para>Bước 4: Trả về danh sách ForumTopicDto.</para>
    /// </summary>
    public async Task<List<ForumTopicDto>> GetTopicsAsync()
    {
        // [BƯỚC 1 & 2]: Truy vấn danh mục chủ đề và đếm số lượng bài viết công khai
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

        // [BƯỚC 3]: Rẽ nhánh tự động seed chủ đề mẫu nếu bảng rỗng
        if (!topics.Any())
        {
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

        // [BƯỚC 4]: Trả về danh sách chủ đề đã có trong CSDL
        return topics;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Truy vấn danh sách bài viết trên diễn đàn với bộ lọc đa tiêu chí, bảo mật phân quyền, ghim ưu tiên và phân trang.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Khởi tạo baseQuery kèm Eager Loading Topic, Author và Role, bật AsNoTracking().</para>
    /// <para>Bước 2: Phân quyền hiển thị (Visibility Matrix):</para>
    /// <para>  + Nếu không phải Admin: Người xem thường chỉ thấy PUBLISHED; nếu là tác giả thì thấy thêm bài HIDDEN của chính mình.</para>
    /// <para>  + Nếu là Admin: Thấy mọi bài có Status != DELETED.</para>
    /// <para>Bước 3: Lọc theo TopicId (nếu có truyền).</para>
    /// <para>Bước 4: Tìm kiếm từ khóa (Search) trong Tiêu đề hoặc Nội dung bài viết.</para>
    /// <para>Bước 5: Sắp xếp theo switch expression: Ghim (IsPinned = true) luôn ưu tiên cao nhất, sau đó đến Hot / Most Commented / Latest.</para>
    /// <para>Bước 6: Đếm totalItems và phân trang Skip / Take.</para>
    /// <para>Bước 7: Nạp danh sách Reaction và Report của người dùng hiện tại (nếu đã đăng nhập) để hiển thị cờ tương tác cá nhân.</para>
    /// <para>Bước 8: Áp dụng mặt nạ ẩn danh (Anonymity Masking) nếu bài viết ở chế độ IsAnonymous.</para>
    /// <para>Bước 9: Đóng gói và trả về PaginatedResult chứa ForumPostDto.</para>
    /// </summary>
    public async Task<PaginatedResult<ForumPostDto>> GetPostsAsync(PostQueryParameters query, int? currentUserId, bool isAdmin)
    {
        // [BƯỚC 1]: Khởi tạo truy vấn kèm Eager Loading thông tin Topic, Author và Role
        var baseQuery = _context.ForumPosts
            .Include(p => p.Topic)
            .Include(p => p.Author).ThenInclude(a => a.Role)
            .AsNoTracking();

        // [BƯỚC 2]: Ma trận phân quyền hiển thị bài viết (Visibility Matrix)
        if (!isAdmin)
        {
            // Người dùng thông thường hoặc học viên
            if (currentUserId.HasValue)
            {
                // Thấy bài PUBLISHED của mọi người HOẶC bài của chính mình (chưa bị xóa)
                baseQuery = baseQuery.Where(p => p.Status == "PUBLISHED" || (p.AuthorId == currentUserId.Value && p.Status != "DELETED"));
            }
            else
            {
                // Khách vãng lai chưa đăng nhập: Chỉ thấy bài PUBLISHED
                baseQuery = baseQuery.Where(p => p.Status == "PUBLISHED");
            }
        }
        else
        {
            // Quản trị viên (Admin): Thấy tất cả các bài trừ bài đã bị xóa mềm (DELETED)
            baseQuery = baseQuery.Where(p => p.Status != "DELETED");
        }

        // [BƯỚC 3]: Lọc theo chủ đề thảo luận (TopicId)
        if (query.TopicId.HasValue && query.TopicId.Value > 0)
        {
            baseQuery = baseQuery.Where(p => p.TopicId == query.TopicId.Value);
        }

        // [BƯỚC 4]: Tìm kiếm từ khóa không phân biệt hoa thường trong Tiêu đề hoặc Nội dung
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower();
            baseQuery = baseQuery.Where(p => p.Title.ToLower().Contains(search) || p.Content.ToLower().Contains(search));
        }

        // [BƯỚC 5]: Sắp xếp đa tầng: Bài Ghim (IsPinned = true) luôn đứng đầu, sau đó theo tiêu chí người dùng chọn
        baseQuery = query.SortBy.ToLower() switch
        {
            // Sắp xếp bài "Hot": Tổng số lượt thả cảm xúc + tổng số bình luận cao nhất
            "hot" => baseQuery.OrderByDescending(p => p.IsPinned).ThenByDescending(p => p.ReactionsCount + p.CommentsCount),
            // Sắp xếp bài có nhiều thảo luận nhất
            "most_commented" => baseQuery.OrderByDescending(p => p.IsPinned).ThenByDescending(p => p.CommentsCount),
            // Mặc định: Sắp xếp theo bài mới đăng gần nhất
            _ => baseQuery.OrderByDescending(p => p.IsPinned).ThenByDescending(p => p.CreatedAt)
        };

        // [BƯỚC 6]: Đếm tổng số bản ghi và phân trang
        var totalItems = await baseQuery.CountAsync();
        var page = query.Page > 0 ? query.Page : 1;
        var limit = query.Limit > 0 ? query.Limit : 10;

        var posts = await baseQuery
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        // [BƯỚC 7]: Nạp tương tác cá nhân (UserReaction và UserHasReported) cho các bài viết trong trang hiện tại
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

        // [BƯỚC 8]: Ánh xạ thực thể sang DTO kèm quy chuẩn mặt nạ ẩn danh
        var items = posts.Select(p =>
        {
            int authorId = p.AuthorId;
            string authorName = p.Author?.FullName ?? "Học viên";
            string? authorAvatar = p.Author?.AvatarUrl;
            string authorRole = p.Author?.Role?.RoleName ?? "Learner";

            // Bảo mật danh tính: Nếu bài đăng ở chế độ ẩn danh và người xem KHÔNG PHẢI Admin
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

        // [BƯỚC 9]: Trả về kết quả phân trang hoàn chỉnh
        return new PaginatedResult<ForumPostDto>(items, totalItems, page, limit);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy thông tin chi tiết bài viết theo ID, kiểm tra quyền xem bài ẩn và tự động tăng số lượt xem (ViewsCount).
    /// </summary>
    public async Task<ForumPostDto?> GetPostByIdAsync(int postId, int? currentUserId, bool isAdmin)
    {
        // [BƯỚC 1]: Tìm bài viết theo postId
        var post = await _context.ForumPosts
            .Include(p => p.Topic)
            .Include(p => p.Author).ThenInclude(a => a.Role)
            .FirstOrDefaultAsync(p => p.PostId == postId);

        if (post is null || post.Status == "DELETED")
            return null;

        // [BƯỚC 2]: Kiểm tra quyền xem bài viết nếu bài đang bị ẩn
        // Chỉ Admin hoặc chính Tác giả bài viết mới được xem bài viết không ở trạng thái PUBLISHED
        if (post.Status != "PUBLISHED" && !isAdmin && (!currentUserId.HasValue || currentUserId.Value != post.AuthorId))
        {
            return null; // Từ chối truy cập bài viết bị ẩn
        }

        // [BƯỚC 3]: Tự động tăng lượt xem bài viết
        post.ViewsCount += 1;
        await _context.SaveChangesAsync();

        string? userReaction = null;
        bool userHasReported = false;

        // [BƯỚC 4]: Kiểm tra tương tác của người xem hiện tại
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

        // Áp dụng mặt nạ ẩn danh nếu cần
        if (post.IsAnonymous && !isAdmin)
        {
            authorId = 0;
            authorName = "Học viên ẩn danh";
            authorAvatar = null;
            authorRole = "Learner";
        }

        // [BƯỚC 5]: Trả về DTO chi tiết
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Đăng bài viết mới lên diễn đàn, kiểm tra sự tồn tại của TopicId và lưu vào CSDL.
    /// </summary>
    public async Task<ForumPostDto> CreatePostAsync(int authorId, CreatePostRequest request)
    {
        // [BƯỚC 1]: Kiểm tra chủ đề thảo luận có tồn tại không
        var topicExists = await _context.ForumTopics.AnyAsync(t => t.TopicId == request.TopicId);
        if (!topicExists)
        {
            throw new InvalidOperationException("Chủ đề diễn đàn không tồn tại.");
        }

        // [BƯỚC 2]: Khởi tạo thực thể bài viết mới
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

        // [BƯỚC 3]: Lưu bài viết vào CSDL
        _context.ForumPosts.Add(post);
        await _context.SaveChangesAsync();

        // [BƯỚC 4]: Tái sử dụng hàm GetPostByIdAsync để lấy DTO hoàn chỉnh kèm thông tin Topic và Author
        return (await GetPostByIdAsync(post.PostId, authorId, false))!;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cập nhật nội dung bài viết đã đăng, kiểm tra quyền sở hữu tác giả và trạng thái PUBLISHED.
    /// </summary>
    public async Task<ForumPostDto?> UpdatePostAsync(int postId, int userId, UpdatePostRequest request)
    {
        // [BƯỚC 1]: Tìm bài viết
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);
        if (post is null || post.Status == "DELETED")
            return null;

        // [BƯỚC 2]: Kiểm tra quyền tác giả: Không cho phép sửa bài của người khác
        if (post.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa bài viết của người khác.");
        }

        // [BƯỚC 3]: Không cho phép sửa nếu bài viết đang bị tạm ẩn
        if (post.Status != "PUBLISHED")
        {
            throw new InvalidOperationException("Bài viết đang trong trạng thái tạm ẩn, không thể chỉnh sửa.");
        }

        // [BƯỚC 4]: Cập nhật các trường thông tin
        post.TopicId = request.TopicId;
        post.Title = request.Title.Trim();
        post.Content = request.Content.Trim();
        post.ImageUrl = request.ImageUrl?.Trim();
        post.IsAnonymous = request.IsAnonymous;
        post.UpdatedAt = DateTime.UtcNow;

        _context.ForumPosts.Update(post);
        await _context.SaveChangesAsync();

        // Trả về DTO cập nhật mới nhất
        return await GetPostByIdAsync(postId, userId, false);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xóa mềm bài viết (chuyển trạng thái sang DELETED), kiểm tra quyền tác giả hoặc quyền Admin.
    /// </summary>
    public async Task<bool> DeletePostAsync(int postId, int userId, bool isAdmin)
    {
        // [BƯỚC 1]: Tìm bài viết cần xóa
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);
        if (post is null || post.Status == "DELETED")
            return false;

        // [BƯỚC 2]: Kiểm tra quyền: Phải là tác giả hoặc Admin
        if (!isAdmin && post.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xóa bài viết của người khác.");
        }

        // [BƯỚC 3]: Chuyển trạng thái sang DELETED (Soft Delete)
        post.Status = "DELETED";
        post.UpdatedAt = DateTime.UtcNow;

        _context.ForumPosts.Update(post);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy hồ sơ hoạt động của thành viên diễn đàn, thống kê tổng số lượng bài viết và bình luận đã đóng góp.
    /// </summary>
    public async Task<ForumUserProfileDto?> GetUserProfileAsync(int userId)
    {
        // [BƯỚC 1]: Tìm thông tin người dùng từ bảng Users
        var user = await _context.Users
            .Include(u => u.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user is null) return null;

        // [BƯỚC 2]: Đếm tổng số bài viết công khai của thành viên này
        var postsCount = await _context.ForumPosts
            .CountAsync(p => p.AuthorId == userId && p.Status == "PUBLISHED");

        // [BƯỚC 3]: Đếm tổng số bình luận đang hoạt động của thành viên này
        var commentsCount = await _context.ForumComments
            .CountAsync(c => c.AuthorId == userId && c.Status == "ACTIVE");

        // [BƯỚC 4]: Khởi tạo và trả về ForumUserProfileDto
        return new ForumUserProfileDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            AvatarUrl = user.AvatarUrl,
            RoleName = user.Role?.RoleName ?? "Learner",
            JoinedAt = user.CreatedAt,
            PostsCount = postsCount,
            CommentsCount = commentsCount
        };
    }
}
