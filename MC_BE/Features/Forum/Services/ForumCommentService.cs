// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Business Logic Layer / Application Service Implementation.
// - Nằm trong module: Features/Forum/Services.
// - Hiện thực (Implements): Giao diện IForumCommentService.
// - Vai trò: Quản lý toàn bộ vòng đời của bình luận trên diễn đàn bao gồm: Dựng cây bình luận 2 cấp (Hierarchical Tree),
//   áp dụng chính sách che mờ danh tính khi ẩn danh (Anonymity Masking), kiểm soát tính hợp lệ bài viết (Locked/Hidden check),
//   và duy trì tính toàn vẹn của biến đếm CommentsCount trên thực thể ForumPost.
// - Nguyên lý: Tách biệt hoàn toàn logic cấu trúc cây và phân quyền tác giả khỏi Presentation Layer (ForumCommentsController).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Tạo không gian trao đổi, giải đáp học tập tương tác cao cho cộng đồng MC:
//   1. Thuật toán cây 2 cấp tối ưu UX: Giới hạn độ sâu tối đa 2 cấp (Bình luận gốc Level 1 -> Các câu trả lời Level 2 gom nhóm).
//      Nếu người dùng bấm reply một bình luận Level 2, hệ thống tự động gán ParentCommentId về bình luận gốc của chuỗi
//      để tránh thụt dòng vô tận (Infinite Nested Indentation) gây vỡ giao diện trên thiết bị di động.
//   2. Bảo mật danh tính (Anonymity Masking): Nếu IsAnonymous = true, mọi dữ liệu tác giả (Id, Họ tên, Avatar, Role)
//      sẽ bị che thành "Học viên ẩn danh" đối với người xem thông thường, nhưng vẫn lưu Id thật trong DB cho mục đích kiểm duyệt.
//   3. Kiểm soát nội dung vi phạm: Bình luận bị ẩn (HIDDEN_BY_ADMIN) sẽ hiển thị thông báo "[Bình luận này đang bị ẩn do vi phạm quy chuẩn]"
//      đối với người xem thường, trong khi Admin và chính tác giả vẫn thấy nội dung gốc.
//   4. Tự động đồng bộ biến đếm CommentsCount của bài viết khi thêm mới hoặc xóa bình luận.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: ForumCommentsController inject IForumCommentService.
// - Service: ForumCommentService inject SmartMcDbContext để truy xuất ForumComments, ForumPosts, ForumReactions, ForumReports, Users.
// ====================================================================================================

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

/// <summary>
/// Lớp triển khai các nghiệp vụ bình luận và dựng cây thảo luận trên diễn đàn MSEEK.
/// </summary>
public class ForumCommentService : IForumCommentService
{
    // [Giải phẫu Dependency Field]:
    // - private readonly SmartMcDbContext _context: Thể hiện DbContext kết nối CSDL với tính bất biến.
    private readonly SmartMcDbContext _context;

    /// <summary>
    /// Khởi tạo Service với DbContext được inject từ DI Container.
    /// </summary>
    /// <param name="context">DbContext kết nối cơ sở dữ liệu.</param>
    public ForumCommentService(SmartMcDbContext context)
    {
        // [Dòng này làm gì]: Gán thể hiện DbContext vào biến nội bộ.
        _context = context;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Truy vấn toàn bộ bình luận của bài viết và tổ chức thành cấu trúc cây 2 cấp (Top-level comments và Replies).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Truy vấn danh sách bình luận phẳng từ DB có trạng thái khác DELETED, kèm nạp thông tin Tác giả và Vai trò.</para>
    /// <para>Bước 2: Nếu có currentUserId, nạp trước (Batching) các Reaction và Report cá nhân thành Dictionary/HashSet để tối ưu O(1) tra cứu.</para>
    /// <para>Bước 3: Hàm cục bộ MapToDto: Thực hiện mặt nạ ẩn danh (Anonymity Masking) và kiểm duyệt nội dung bị ẩn.</para>
    /// <para>Bước 4: Tách danh sách thành Top-level (Depth 1) và gom nhóm các Replies (Depth 2) theo ParentCommentId.</para>
    /// <para>Bước 5: Ghép danh sách Replies vào thuộc tính Replies của từng bình luận gốc tương ứng.</para>
    /// <para>Bước 6: Trả về danh sách bình luận gốc đã hoàn chỉnh cây phân cấp.</para>
    /// </summary>
    /// <param name="postId">ID của bài viết.</param>
    /// <param name="currentUserId">ID người dùng đang xem (hoặc null).</param>
    /// <param name="isAdmin">Cờ quyền Quản trị viên.</param>
    /// <returns>Danh sách ForumCommentDto dạng cây phân cấp.</returns>
    public async Task<List<ForumCommentDto>> GetCommentsByPostIdAsync(int postId, int? currentUserId, bool isAdmin)
    {
        // [BƯỚC 1]: Truy vấn danh sách bình luận phẳng từ CSDL
        // - .Include(c => c.Author).ThenInclude(a => a.Role): Nạp tác giả và vai trò (Learner/Instructor/Admin).
        // - .Where(c => c.PostId == postId && c.Status != "DELETED"): Loại bỏ các bình luận đã bị xóa mềm.
        // - .AsNoTracking(): Tắt Change Tracker tối ưu tốc độ đọc.
        var comments = await _context.ForumComments
            .Include(c => c.Author).ThenInclude(a => a.Role)
            .Where(c => c.PostId == postId && c.Status != "DELETED")
            .AsNoTracking()
            .ToListAsync();

        // Lấy danh sách ID của các bình luận vừa tải về
        var commentIds = comments.Select(c => c.CommentId).ToList();
        var userReactions = new Dictionary<int, string>();
        var userReports = new HashSet<int>();

        // [BƯỚC 2]: Tải thông tin tương tác cá nhân nếu người dùng đã đăng nhập (Tránh N+1 query)
        if (currentUserId.HasValue && commentIds.Any())
        {
            // Lấy loại cảm xúc người dùng đã thả cho từng comment (ánh xạ vào Dictionary để tra cứu O(1))
            userReactions = await _context.ForumReactions
                .Where(r => r.UserId == currentUserId.Value && r.TargetType == "COMMENT" && r.CommentId.HasValue && commentIds.Contains(r.CommentId.Value))
                .ToDictionaryAsync(r => r.CommentId!.Value, r => r.ReactionType);

            // Lấy danh sách commentId mà người dùng này đã từng gửi báo cáo vi phạm
            userReports = (await _context.ForumReports
                .Where(r => r.ReporterId == currentUserId.Value && r.TargetType == "COMMENT" && r.CommentId.HasValue && commentIds.Contains(r.CommentId.Value))
                .Select(r => r.CommentId!.Value)
                .ToListAsync()).ToHashSet();
        }

        // [BƯỚC 3]: Hàm cục bộ (Local Function) ánh xạ thực thể sang DTO kèm quy tắc che mờ bảo mật
        ForumCommentDto MapToDto(ForumComment c)
        {
            bool isAuthor = currentUserId.HasValue && c.AuthorId == currentUserId.Value;

            // Xử lý ẩn danh (API Anonymity Masking): Nếu bình luận ở chế độ ẩn danh và người xem KHÔNG PHẢI Admin,
            // che hoàn toàn thông tin nhận diện tác giả để bảo vệ quyền riêng tư của thành viên.
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

            // Xử lý bình luận bị ẩn (Hidden Content Masking): Nếu bình luận vi phạm và người xem không phải Admin/Tác giả
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

        // Ánh xạ toàn bộ bình luận sang DTO
        var allDtos = comments.Select(MapToDto).ToList();

        // [BƯỚC 4]: Lọc danh sách bình luận cấp 1 (Bình luận gốc) sắp xếp theo thời gian tăng dần
        var topLevelComments = allDtos
            .Where(c => c.ParentCommentId == null || c.DepthLevel == 1)
            .OrderBy(c => c.CreatedAt)
            .ToList();

        // [BƯỚC 5]: Gom nhóm các câu trả lời cấp 2 (Replies) theo ID bình luận cha
        var repliesMap = allDtos
            .Where(c => c.ParentCommentId.HasValue && c.DepthLevel == 2)
            .GroupBy(c => c.ParentCommentId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderBy(r => r.CreatedAt).ToList());

        // Ghép câu trả lời vào bình luận gốc tương ứng
        foreach (var parent in topLevelComments)
        {
            if (repliesMap.TryGetValue(parent.CommentId, out var replies))
            {
                parent.Replies = replies;
            }
        }

        // [BƯỚC 6]: Trả về cây bình luận hoàn chỉnh
        return topLevelComments;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Tạo mới bình luận hoặc phản hồi cho một bình luận có sẵn, kiểm tra trạng thái bài viết và tăng CommentsCount.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Kiểm tra bài viết tồn tại, không bị xóa, đang PUBLISHED và không bị khóa (IsLocked).</para>
    /// <para>Bước 2: Xử lý phân cấp: Nếu reply một bình luận cấp 2, gán cha về bình luận gốc để duy trì độ sâu tối đa là 2.</para>
    /// <para>Bước 3: Tạo thực thể ForumComment, lưu vào CSDL.</para>
    /// <para>Bước 4: Tăng biến đếm CommentsCount của ForumPost lên 1 đơn vị.</para>
    /// <para>Bước 5: Nạp thông tin tác giả và trả về ForumCommentDto vừa tạo.</para>
    /// </summary>
    public async Task<ForumCommentDto> AddCommentAsync(int authorId, CreateCommentRequest request)
    {
        // [BƯỚC 1]: Kiểm tra bài viết có tồn tại trong CSDL không
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == request.PostId);
        if (post is null || post.Status == "DELETED")
        {
            throw new InvalidOperationException("Bài viết không tồn tại.");
        }

        // Rẽ nhánh: Bài viết đang bị ẩn do vi phạm -> Chặn bình luận
        if (post.Status != "PUBLISHED")
        {
            throw new InvalidOperationException("Bài viết đang trong trạng thái bị ẩn, không thể bình luận.");
        }

        // Rẽ nhánh: Bài viết bị khóa thảo luận bởi Admin/Tác giả -> Chặn bình luận
        if (post.IsLocked)
        {
            throw new InvalidOperationException("Bài viết này đã bị khóa bình luận.");
        }

        int depthLevel = 1;
        int? parentCommentId = null;

        // [BƯỚC 2]: Xử lý bình luận cha nếu đây là hành động phản hồi (Reply)
        if (request.ParentCommentId.HasValue && request.ParentCommentId.Value > 0)
        {
            var parent = await _context.ForumComments
                .FirstOrDefaultAsync(c => c.CommentId == request.ParentCommentId.Value && c.PostId == request.PostId);

            if (parent is null || parent.Status == "DELETED")
            {
                throw new InvalidOperationException("Bình luận cha không tồn tại.");
            }

            // Quy tắc độ sâu tối đa 2 cấp: Nếu phản hồi vào một bình luận con (Level 2),
            // liên kết thẳng vào bình luận cha gốc (ParentCommentId của parent) để không bị thụt lề cấp 3 trở lên
            parentCommentId = parent.ParentCommentId ?? parent.CommentId;
            depthLevel = 2;
        }

        // [BƯỚC 3]: Khởi tạo thực thể bình luận mới
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

        // [BƯỚC 4]: Tăng biến đếm số bình luận của bài viết
        post.CommentsCount += 1;
        _context.ForumPosts.Update(post);

        // Lưu đồng thời bình luận mới và cập nhật bài viết vào DB trong cùng 1 Transaction ngầm
        await _context.SaveChangesAsync();

        // [BƯỚC 5]: Nạp thông tin tác giả để ánh xạ sang DTO trả về
        var author = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.UserId == authorId);

        int returnAuthorId = authorId;
        string returnAuthorName = author?.FullName ?? "Học viên";
        string? returnAuthorAvatar = author?.AvatarUrl;
        string returnAuthorRole = author?.Role?.RoleName ?? "Learner";

        // Áp dụng mặt nạ ẩn danh trên DTO trả về cho Client
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Chỉnh sửa nội dung bình luận đã đăng, kiểm tra quyền tác giả và trạng thái ACTIVE.
    /// </summary>
    public async Task<ForumCommentDto?> UpdateCommentAsync(int commentId, int userId, UpdateCommentRequest request)
    {
        // [BƯỚC 1]: Tìm bình luận cần sửa
        var comment = await _context.ForumComments
            .Include(c => c.Author).ThenInclude(a => a.Role)
            .FirstOrDefaultAsync(c => c.CommentId == commentId);

        if (comment is null || comment.Status == "DELETED")
            return null;

        // [BƯỚC 2]: Kiểm tra quyền tác giả: Chỉ chính người tạo mới được sửa
        if (comment.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa bình luận của người khác.");
        }

        // [BƯỚC 3]: Kiểm tra trạng thái: Không cho phép sửa nếu bình luận đang bị ẩn bởi Admin
        if (comment.Status != "ACTIVE")
        {
            throw new InvalidOperationException("Bình luận đang trong trạng thái bị ẩn, không thể chỉnh sửa.");
        }

        // [BƯỚC 4]: Cập nhật dữ liệu
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xóa mềm bình luận (chuyển sang DELETED), kiểm tra quyền tác giả/Admin và giảm CommentsCount của bài viết.
    /// </summary>
    public async Task<bool> DeleteCommentAsync(int commentId, int userId, bool isAdmin)
    {
        // [BƯỚC 1]: Tìm bình luận cần xóa
        var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (comment is null || comment.Status == "DELETED")
            return false;

        // [BƯỚC 2]: Kiểm tra quyền: Người dùng phải là tác giả hoặc có quyền Admin
        if (!isAdmin && comment.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Bạn không có quyền xóa bình luận của người khác.");
        }

        // [BƯỚC 3]: Chuyển trạng thái sang DELETED (Soft Delete)
        comment.Status = "DELETED";
        comment.UpdatedAt = DateTime.UtcNow;

        _context.ForumComments.Update(comment);

        // [BƯỚC 4]: Giảm biến đếm CommentsCount của bài viết nếu > 0
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == comment.PostId);
        if (post != null && post.CommentsCount > 0)
        {
            post.CommentsCount -= 1;
            _context.ForumPosts.Update(post);
        }

        // [BƯỚC 5]: Lưu thay đổi vào CSDL
        await _context.SaveChangesAsync();
        return true;
    }
}
