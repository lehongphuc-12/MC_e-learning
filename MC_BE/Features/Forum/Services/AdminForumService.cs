// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Business Logic Layer / Application Service Implementation.
// - Nằm trong module: Features/Forum/Services.
// - Hiện thực (Implements): Giao diện IAdminForumService.
// - Vai trò: Đóng vai trò là trung tâm kiểm duyệt và quản trị nội dung diễn đàn dành riêng cho Quản trị viên (Admin Workspace).
// - Nguyên lý: Đóng gói toàn bộ logic can thiệp dữ liệu đặc quyền (Moderation Rules, Soft Delete, Bác bỏ/Xử lý báo cáo,
//   Khôi phục bài viết và đồng bộ trạng thái các báo cáo liên quan) tách biệt hoàn toàn khỏi Controller.
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Đảm bảo môi trường diễn đàn văn minh, an toàn và tuân thủ chuẩn mực cộng đồng MC MSEEK:
//   1. Quản lý hàng đợi báo cáo vi phạm (Moderation Queue): Lọc theo trạng thái PENDING/RESOLVED/DISMISSED và đối tượng POST/COMMENT.
//   2. Xử lý triệt để báo cáo: Khi Admin bấm HIDE hoặc DELETE, hệ thống tự động cập nhật trạng thái của đối tượng vi phạm
//      đồng thời lưu vết AdminId đã duyệt và thời điểm xử lý.
//   3. Khôi phục thông minh (Smart Restore): Khi Admin phục hồi một bài viết hoặc bình luận bị báo cáo nhầm về trạng thái bình thường,
//      hệ thống tự động xóa bộ đếm ReportsCount về 0 và chuyển toàn bộ các báo cáo PENDING cũ thành RESOLVED để ngăn ngừa cơ chế auto-hide tái kích hoạt.
//   4. Quản lý danh mục chủ đề (Topics CRUD): Tạo mới slug chuẩn hóa SEO, cập nhật thông tin và vô hiệu hóa chủ đề.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controller: AdminForumController tiếp nhận HTTP Request từ Admin Dashboard và gọi vào AdminForumService.
// - Service: AdminForumService inject SmartMcDbContext để thao tác trực tiếp với EF Core Change Tracker.
// - CSDL: Cập nhật các bảng ForumReports, ForumPosts, ForumComments, ForumTopics.
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
/// Lớp triển khai các dịch vụ kiểm duyệt và quản trị diễn đàn MSEEK.
/// </summary>
public class AdminForumService : IAdminForumService
{
    // [Giải phẫu Dependency Field]:
    // - private readonly: Đảm bảo biến _context chỉ được khởi tạo 1 lần trong Constructor và không bị ghi đè sau đó.
    // - SmartMcDbContext: DbContext trung tâm của ứng dụng kết nối tới PostgreSQL/SQL Server thông qua EF Core.
    private readonly SmartMcDbContext _context;

    /// <summary>
    /// Khởi tạo Service với DbContext được inject từ DI Container (Scoped Lifetime).
    /// </summary>
    /// <param name="context">Thể hiện DbContext kết nối cơ sở dữ liệu.</param>
    public AdminForumService(SmartMcDbContext context)
    {
        // [Dòng này làm gì]: Gán DbContext được inject vào biến cục bộ để sử dụng xuyên suốt Service.
        _context = context;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách các đơn báo cáo vi phạm (Reports) với bộ lọc trạng thái, loại đối tượng và phân trang.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Khởi tạo IQueryable từ DbSet ForumReports kèm nạp trước (Eager Loading) thông tin Reporter, ResolvedBy, Post, Comment và Author.</para>
    /// <para>Bước 2: Rẽ nhánh lọc theo status (PENDING, RESOLVED, DISMISSED) nếu được cung cấp.</para>
    /// <para>Bước 3: Rẽ nhánh lọc theo targetType (POST, COMMENT) nếu được cung cấp.</para>
    /// <para>Bước 4: Đếm tổng số bản ghi thỏa mãn điều kiện phục vụ phân trang.</para>
    /// <para>Bước 5: Áp dụng OrderByDescending theo ngày tạo, Skip và Take để phân trang hiệu quả.</para>
    /// <para>Bước 6: Duyệt danh sách bản ghi và trích xuất dữ liệu bài viết/bình luận tương ứng sang ForumReportDto.</para>
    /// <para>Bước 7: Trả về PaginatedResult chứa danh sách DTO và metadata phân trang.</para>
    /// </summary>
    /// <param name="page">Số trang hiện tại (bắt đầu từ 1).</param>
    /// <param name="limit">Số bản ghi trên mỗi trang (mặc định 10).</param>
    /// <param name="status">Trạng thái lọc.</param>
    /// <param name="targetType">Loại đối tượng lọc.</param>
    /// <returns>PaginatedResult chứa danh sách ForumReportDto.</returns>
    public async Task<PaginatedResult<ForumReportDto>> GetReportsAsync(int page, int limit, string? status, string? targetType)
    {
        // [BƯỚC 1]: Khởi tạo truy vấn LINQ với Eager Loading toàn bộ các quan hệ cần thiết
        // [Giải phẫu từng từ khóa & phương thức EF Core]:
        // - _context.ForumReports: Truy cập DbSet đại diện cho bảng ForumReports trong CSDL.
        // - .Include(r => r.Reporter): Thực hiện SQL LEFT JOIN lấy thông tin người gửi báo cáo (User).
        // - .Include(r => r.ResolvedBy): JOIN lấy thông tin Quản trị viên đã xử lý báo cáo.
        // - .Include(r => r.Post).ThenInclude(p => p!.Author): Nạp thực thể Post và sau đó nạp tiếp tác giả của Post.
        // - .Include(r => r.Post).ThenInclude(p => p!.Topic): Nạp thông tin chủ đề của Post.
        // - .Include(r => r.Comment).ThenInclude(c => c!.Author): Nạp thực thể Comment và tác giả bình luận.
        // - .AsNoTracking(): Tắt bộ theo dõi thay đổi (Change Tracker) để tăng tốc độ truy vấn đọc và tiết kiệm RAM.
        var query = _context.ForumReports
            .Include(r => r.Reporter)
            .Include(r => r.ResolvedBy)
            .Include(r => r.Post).ThenInclude(p => p!.Author)
            .Include(r => r.Post).ThenInclude(p => p!.Topic)
            .Include(r => r.Comment).ThenInclude(c => c!.Author)
            .AsNoTracking();

        // [BƯỚC 2]: Rẽ nhánh kiểm tra bộ lọc trạng thái báo cáo
        // - Điều kiện: !string.IsNullOrWhiteSpace(status)
        // - TH TRUE: Thêm mệnh đề WHERE r.Status == status.ToUpper() vào câu lệnh SQL.
        // - TH FALSE: Bỏ qua, lấy tất cả trạng thái.
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status == status.ToUpper());
        }

        // [BƯỚC 3]: Rẽ nhánh kiểm tra bộ lọc loại đối tượng bị báo cáo (POST hoặc COMMENT)
        // - TH TRUE: Thêm mệnh đề WHERE r.TargetType == targetType.ToUpper().
        // - TH FALSE: Lấy cả báo cáo bài viết lẫn bình luận.
        if (!string.IsNullOrWhiteSpace(targetType))
        {
            query = query.Where(r => r.TargetType == targetType.ToUpper());
        }

        // [BƯỚC 4]: Đếm tổng số lượng bản ghi thỏa mãn điều kiện lọc trên CSDL (Sinh lệnh SELECT COUNT(*))
        var totalItems = await query.CountAsync();

        // Chuẩn hóa chỉ số phân trang tránh số âm hoặc bằng 0
        page = page > 0 ? page : 1;
        limit = limit > 0 ? limit : 10;

        // [BƯỚC 5]: Thực hiện phân trang và truy vấn dữ liệu từ CSDL
        // - .OrderByDescending(r => r.CreatedAt): Sắp xếp đơn báo cáo mới nhất lên đầu danh sách.
        // - .Skip((page - 1) * limit): Bỏ qua các bản ghi của các trang trước đó.
        // - .Take(limit): Giới hạn số lượng bản ghi cần lấy về trong trang hiện tại.
        // - .ToListAsync(): Thực thi câu truy vấn SQL bất đồng bộ và nạp kết quả vào bộ nhớ.
        var reports = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        // [BƯỚC 6]: Chuyển đổi (Map) danh sách thực thể sang danh sách DTO an toàn
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

            // Rẽ nhánh: Báo cáo nhắm vào Bài viết (POST)
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
            // Rẽ nhánh: Báo cáo nhắm vào Bình luận (COMMENT)
            else if (r.TargetType == "COMMENT" && r.Comment != null)
            {
                authorId = r.Comment.AuthorId;
                authorName = r.Comment.Author?.FullName ?? "Học viên";
                authorEmail = r.Comment.Author?.Email;
                targetStatus = r.Comment.Status;
                commentContent = r.Comment.Content;
                commentImageUrl = r.Comment.ImageUrl;
                // Tạo đoạn trích dẫn ngắn tối đa 80 ký tự cho bình luận
                commentSnippet = r.Comment.Content.Length > 80 ? r.Comment.Content.Substring(0, 80) + "..." : r.Comment.Content;
            }

            // Khởi tạo DTO chứa thông tin tổng hợp cho Dashboard của Admin
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

        // [BƯỚC 7]: Đóng gói kết quả phân trang và trả về
        return new PaginatedResult<ForumReportDto>(items, totalItems, page, limit);
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Lấy danh sách toàn bộ bài viết phục vụ màn hình quản trị của Admin (xem được bài ở mọi trạng thái).
    /// </summary>
    public async Task<PaginatedResult<ForumPostDto>> GetAdminPostsAsync(int page, int limit, int? topicId, string? status, string? search)
    {
        // Khởi tạo truy vấn có Eager Loading thông tin Topic và Author
        var query = _context.ForumPosts
            .Include(p => p.Topic)
            .Include(p => p.Author)
            .AsNoTracking();

        // Rẽ nhánh: Lọc theo chủ đề cụ thể nếu có
        if (topicId.HasValue && topicId.Value > 0)
        {
            query = query.Where(p => p.TopicId == topicId.Value);
        }

        // Rẽ nhánh: Lọc theo trạng thái bài viết (PUBLISHED, HIDDEN_BY_ADMIN, DELETED)
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(p => p.Status == status.ToUpper());
        }

        // Rẽ nhánh: Tìm kiếm từ khóa không phân biệt hoa thường trong Tiêu đề, Nội dung hoặc Tên tác giả
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Title.ToLower().Contains(s) 
                || p.Content.ToLower().Contains(s) 
                || (p.Author != null && p.Author.FullName.ToLower().Contains(s)));
        }

        // Tính tổng số lượng bài viết thỏa mãn điều kiện
        var totalItems = await query.CountAsync();
        page = page > 0 ? page : 1;
        limit = limit > 0 ? limit : 10;

        // Phân trang và tải bài viết về bộ nhớ
        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        // Ánh xạ sang danh sách ForumPostDto
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Quản trị viên xử lý đơn báo cáo vi phạm theo hành động cụ thể (DISMISS, HIDE, DELETE).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Tìm bản ghi ForumReport theo reportId -> Nếu không thấy trả về false.</para>
    /// <para>Bước 2: Cập nhật trạng thái báo cáo (DISMISSED nếu bác bỏ, RESOLVED nếu chấp thuận xử lý).</para>
    /// <para>Bước 3: Lưu vết thời điểm xử lý ResolvedAt và ID Quản trị viên ResolvedById.</para>
    /// <para>Bước 4: Rẽ nhánh hành động HIDE -> Gọi hàm chuyển trạng thái đối tượng sang HIDDEN_BY_ADMIN.</para>
    /// <para>Bước 5: Rẽ nhánh hành động DELETE -> Gọi hàm chuyển trạng thái đối tượng sang DELETED.</para>
    /// <para>Bước 6: Lưu các thay đổi vào CSDL và trả về true.</para>
    /// </summary>
    public async Task<bool> ResolveReportAsync(int reportId, int adminId, string action)
    {
        // [BƯỚC 1]: Truy vấn bản ghi báo cáo từ CSDL
        var report = await _context.ForumReports.FirstOrDefaultAsync(r => r.ReportId == reportId);
        // Rẽ nhánh: Nếu không tìm thấy báo cáo -> Trả về false
        if (report is null) return false;

        // [BƯỚC 2]: Cập nhật trạng thái báo cáo dựa trên hành động
        report.Status = action.ToUpper() == "DISMISS" ? "DISMISSED" : "RESOLVED";
        report.ResolvedAt = DateTime.UtcNow;
        report.ResolvedById = adminId;

        // [BƯỚC 4]: Rẽ nhánh xử lý hành động HIDE (Ẩn bài viết/bình luận do vi phạm)
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
        // [BƯỚC 5]: Rẽ nhánh xử lý hành động DELETE (Xóa bài viết/bình luận)
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

        // [BƯỚC 6]: Cập nhật bản ghi báo cáo và lưu vào CSDL
        _context.ForumReports.Update(report);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Khôi phục bài viết đã bị ẩn hoặc xóa về trạng thái công khai PUBLISHED và dọn dẹp các báo cáo cũ.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Tìm bài viết theo postId -> Nếu null trả về false.</para>
    /// <para>Bước 2: Đổi Status thành PUBLISHED, cập nhật RestoredAt và reset ReportsCount về 0.</para>
    /// <para>Bước 3: Tìm toàn bộ các báo cáo PENDING nhắm vào bài viết này và chuyển thành RESOLVED để không bị auto-hide lại.</para>
    /// <para>Bước 4: Lưu thay đổi CSDL và trả về true.</para>
    /// </summary>
    public async Task<bool> RestorePostAsync(int postId, int adminId)
    {
        // [BƯỚC 1]: Tìm bài viết cần khôi phục
        var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == postId);
        if (post is null) return false;

        // [BƯỚC 2]: Khôi phục trạng thái và reset số lượt báo cáo
        post.Status = "PUBLISHED";
        post.RestoredAt = DateTime.UtcNow; // Ghi nhận mốc thời gian khôi phục
        post.ReportsCount = 0; // Đặt lại bộ đếm báo cáo về 0
        post.UpdatedAt = DateTime.UtcNow;

        _context.ForumPosts.Update(post);

        // [BƯỚC 3]: Đánh dấu tất cả các báo cáo PENDING của bài viết này thành RESOLVED để tránh bị auto-hide lại
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cập nhật trạng thái của bài viết (PUBLISHED, HIDDEN_BY_ADMIN, DELETED).
    /// </summary>
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Khôi phục bình luận về trạng thái ACTIVE, reset số lượt báo cáo và chuyển các đơn báo cáo PENDING thành RESOLVED.
    /// </summary>
    public async Task<bool> RestoreCommentAsync(int commentId, int adminId)
    {
        var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == commentId);
        if (comment is null) return false;

        comment.Status = "ACTIVE";
        comment.RestoredAt = DateTime.UtcNow; // Ghi nhận thời gian khôi phục
        comment.ReportsCount = 0; // Đặt lại bộ đếm báo cáo
        comment.UpdatedAt = DateTime.UtcNow;

        _context.ForumComments.Update(comment);

        // Đánh dấu tất cả các báo cáo PENDING cho bình luận này thành RESOLVED
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cập nhật trạng thái của bình luận (ACTIVE, HIDDEN_BY_ADMIN, DELETED).
    /// </summary>
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Tạo mới một chủ đề thảo luận (Forum Topic) trên diễn đàn.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Chuẩn hóa URL slug (nếu Client không gửi thì tự động sinh slug từ Name bằng cách đổi khoảng trắng thành gạch nối).</para>
    /// <para>Bước 2: Khởi tạo thực thể ForumTopic với trạng thái ACTIVE.</para>
    /// <para>Bước 3: Lưu thực thể vào CSDL và trả về ForumTopicDto.</para>
    /// </summary>
    public async Task<ForumTopicDto> CreateTopicAsync(CreateForumTopicDto request)
    {
        // [BƯỚC 1]: Chuẩn hóa slug thân thiện với đường dẫn URL
        var slug = !string.IsNullOrWhiteSpace(request.Slug)
            ? request.Slug.Trim().ToLower()
            : request.Name.Trim().ToLower().Replace(" ", "-");

        // [BƯỚC 2]: Tạo thực thể chủ đề mới
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

        // [BƯỚC 3]: Lưu vào CSDL
        _context.ForumTopics.Add(topic);
        await _context.SaveChangesAsync();

        // Trả về DTO
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Cập nhật thông tin chủ đề thảo luận hiện có.
    /// </summary>
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Xóa mềm chủ đề thảo luận (chuyển trạng thái sang INACTIVE để ẩn khỏi menu).
    /// </summary>
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
