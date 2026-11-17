// ====================================================================================================
// [VỊ TRÍ KIẾN TRÚC]:
// - Thuộc tầng: Business Logic Layer / Application Service Implementation.
// - Nằm trong module: Features/Forum/Services.
// - Hiện thực (Implements): Giao diện IForumInteractionService.
// - Vai trò: Chịu trách nhiệm thực thi các nghiệp vụ Tương tác xã hội (Reactions) và Cơ chế tự động bảo vệ cộng đồng (Community Self-Defense / Reporting).
// - Nguyên lý: Đóng gói các quy tắc tương tác đa hình (Polymorphic Target: Hỗ trợ linh hoạt cả POST và COMMENT)
//   vào một Service chuyên biệt, giúp tái sử dụng logic xử lý cho cả 2 luồng Controller (ForumPostsController và ForumCommentsController).
//
// [MỤC ĐÍCH NGHIỆP VỤ]:
// - Thúc đẩy tương tác lành mạnh và bảo vệ diễn đàn tự động không phụ thuộc 100% vào Admin:
//   1. Cơ chế 3 trạng thái của Reaction:
//      - Thêm mới (React): Chưa thả -> Lưu DB và tăng ReactionsCount.
//      - Chuyển đổi (Switch): Đang thả LIKE muốn đổi sang LOVE -> Cập nhật loại, giữ nguyên số lượng.
//      - Hủy (Toggle Off / Unlike): Bấm lại đúng loại đang thả -> Xóa khỏi DB và giảm ReactionsCount an toàn (Math.Max(0)).
//   2. 5 Quy chế chống gian lận & Spam Báo cáo vi phạm (Report Abuse Prevention):
//      - Quy tắc 1: Nghiêm cấm tự báo cáo nội dung của chính mình (Self-Report Prohibition: post.AuthorId == reporterId).
//      - Quy tắc 2: Chặn báo cáo nội dung đã bị ẩn hoặc xóa (Status check).
//      - Quy tắc 3: Mỗi tài khoản chỉ được gửi báo cáo 1 lần duy nhất cho mỗi bài viết/bình luận (Idempotency / Unique reporter check).
//      - Quy tắc 4: Mốc thời gian hồi phục (Restored Threshold): Chỉ đếm các báo cáo phát sinh sau mốc thời gian Admin khôi phục (RestoredAt ?? CreatedAt).
//      - Quy tắc 5: Cơ chế Tự động Ẩn (Auto-Hide Trigger): Khi một bài viết hoặc bình luận nhận đủ từ 5 báo cáo độc lập (>= 5 reports),
//        hệ thống tự động kích hoạt chuyển trạng thái thành "HIDDEN_BY_REPORTS" ngay lập tức để cách ly nội dung xấu độc khỏi cộng đồng trước khi Admin duyệt.
//
// [BẢN ĐỒ LUỒNG DỮ LIỆU & DEPENDENCY]:
// - Controllers: ForumPostsController & ForumCommentsController gọi ToggleReactionAsync và CreateReportAsync.
// - Service: ForumInteractionService thao tác trên SmartMcDbContext cập nhật ForumReactions, ForumReports, ForumPosts, ForumComments.
// ====================================================================================================

using System;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Forum.Services;

/// <summary>
/// Lớp triển khai các dịch vụ tương tác xã hội (Thả cảm xúc) và Báo cáo vi phạm tự động trên diễn đàn MSEEK.
/// </summary>
public class ForumInteractionService : IForumInteractionService
{
    // [Giải phẫu Dependency Field]:
    // - private readonly SmartMcDbContext _context: Quản lý phiên làm việc với CSDL thông qua EF Core.
    private readonly SmartMcDbContext _context;

    /// <summary>
    /// Khởi tạo Service với DbContext được inject từ DI Container.
    /// </summary>
    /// <param name="context">DbContext kết nối cơ sở dữ liệu.</param>
    public ForumInteractionService(SmartMcDbContext context)
    {
        // [Dòng này làm gì]: Gán DbContext vào biến nội bộ của class.
        _context = context;
    }

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Thực hiện thả cảm xúc, đổi loại cảm xúc hoặc hủy cảm xúc cho Bài viết (POST) hoặc Bình luận (COMMENT).
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Chuẩn hóa targetType (POST/COMMENT) -> Ném InvalidOperationException nếu sai loại.</para>
    /// <para>Bước 2: Rẽ nhánh theo targetType:</para>
    /// <para>  + Nếu là POST: Kiểm tra PostId, kiểm tra bài viết tồn tại, không bị DELETED và đang PUBLISHED.</para>
    /// <para>  + Nếu là COMMENT: Kiểm tra CommentId, kiểm tra bình luận tồn tại, không bị DELETED và đang ACTIVE.</para>
    /// <para>Bước 3: Tìm kiếm bản ghi ForumReaction hiện có của userId trên đối tượng.</para>
    /// <para>Bước 4: Rẽ nhánh 3 kịch bản tương tác:</para>
    /// <para>  * Kịch bản A (Toggle OFF): Đã thả và trùng loại -> Remove reaction, giảm ReactionsCount (Math.Max(0)).</para>
    /// <para>  * Kịch bản B (Switch Type): Đã thả nhưng khác loại -> Cập nhật ReactionType mới, giữ nguyên ReactionsCount.</para>
    /// <para>  * Kịch bản C (Add New): Chưa từng thả -> Thêm mới ForumReaction, tăng ReactionsCount += 1.</para>
    /// <para>Bước 5: Lưu thay đổi vào CSDL và trả về ForumReactionSummaryDto.</para>
    /// </summary>
    public async Task<ForumReactionSummaryDto> ToggleReactionAsync(int userId, ToggleReactionRequest request)
    {
        // [BƯỚC 1]: Chuẩn hóa chuỗi loại mục tiêu tương tác
        var targetType = request.TargetType.ToUpper();
        if (targetType != "POST" && targetType != "COMMENT")
        {
            throw new InvalidOperationException("Loại tương tác không hợp lệ. Phải là POST hoặc COMMENT.");
        }

        // [BƯỚC 2.A]: Nhánh xử lý tương tác trên BÀI VIẾT (POST)
        if (targetType == "POST")
        {
            // Kiểm tra tính hợp lệ của PostId
            if (!request.PostId.HasValue || request.PostId.Value <= 0)
                throw new InvalidOperationException("Thiếu ID bài viết.");

            // Tìm bài viết trong CSDL
            var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == request.PostId.Value);
            if (post is null || post.Status == "DELETED")
                throw new InvalidOperationException("Bài viết không tồn tại.");

            // Kiểm tra bài viết có đang mở công khai hay không
            if (post.Status != "PUBLISHED")
                throw new InvalidOperationException("Bài viết đang trong trạng thái tạm ẩn, không thể thả tương tác.");

            // [BƯỚC 3]: Kiểm tra xem người dùng này đã từng thả cảm xúc cho bài viết này chưa
            var existingReaction = await _context.ForumReactions
                .FirstOrDefaultAsync(r => r.UserId == userId && r.TargetType == "POST" && r.PostId == request.PostId.Value);

            bool isReacted = false;
            string? currentType = null;

            // [BƯỚC 4]: Xử lý 3 kịch bản
            if (existingReaction != null)
            {
                // Kịch bản A: Người dùng bấm lại đúng loại cảm xúc đang có -> HỦY THẢ CẢM XÚC (Toggle OFF)
                if (existingReaction.ReactionType.Equals(request.ReactionType, StringComparison.OrdinalIgnoreCase))
                {
                    _context.ForumReactions.Remove(existingReaction);
                    // Dùng Math.Max(0, ...) để phòng ngừa lỗi âm số lượng trong trường hợp Race Condition
                    post.ReactionsCount = Math.Max(0, post.ReactionsCount - 1);
                }
                // Kịch bản B: Người dùng đổi sang cảm xúc khác (ví dụ: từ LIKE sang LOVE)
                else
                {
                    existingReaction.ReactionType = request.ReactionType.ToUpper();
                    _context.ForumReactions.Update(existingReaction);
                    isReacted = true;
                    currentType = existingReaction.ReactionType;
                }
            }
            else
            {
                // Kịch bản C: Thả cảm xúc mới lần đầu tiên
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

            // [BƯỚC 5]: Lưu trạng thái cập nhật vào CSDL
            _context.ForumPosts.Update(post);
            await _context.SaveChangesAsync();

            // Trả về DTO tổng hợp
            return new ForumReactionSummaryDto
            {
                IsReacted = isReacted,
                ReactionType = currentType,
                TotalReactions = post.ReactionsCount
            };
        }
        // [BƯỚC 2.B]: Nhánh xử lý tương tác trên BÌNH LUẬN (COMMENT)
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
                    // Hủy thả cảm xúc cho bình luận
                    _context.ForumReactions.Remove(existingReaction);
                    comment.ReactionsCount = Math.Max(0, comment.ReactionsCount - 1);
                }
                else
                {
                    // Đổi loại cảm xúc
                    existingReaction.ReactionType = request.ReactionType.ToUpper();
                    _context.ForumReactions.Update(existingReaction);
                    isReacted = true;
                    currentType = existingReaction.ReactionType;
                }
            }
            else
            {
                // Thêm cảm xúc mới cho bình luận
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

    /// <summary>
    /// [Dòng này làm gì & Luồng chạy]:
    /// - Tiếp nhận đơn báo cáo vi phạm nội dung và tự động ẩn nội dung (Auto-Hide) nếu vượt ngưỡng 5 báo cáo.
    /// <para>End-to-End Execution Flow:</para>
    /// <para>Bước 1: Chuẩn hóa targetType ("POST" hoặc "COMMENT").</para>
    /// <para>Bước 2: Kiểm tra đối tượng tồn tại và không bị xóa.</para>
    /// <para>Bước 3: Áp dụng RULE 1: Tác giả không thể tự báo cáo nội dung của mình (post.AuthorId == reporterId).</para>
    /// <para>Bước 4: Áp dụng RULE 2: Trạng thái nội dung phải đang hoạt động bình thường (PUBLISHED / ACTIVE).</para>
    /// <para>Bước 5: Áp dụng RULE 3: Chống spam báo cáo trùng lặp từ 1 tài khoản (AnyAsync kiểm tra ReporterId).</para>
    /// <para>Bước 6: Khởi tạo thực thể ForumReport với trạng thái PENDING và lưu DB.</para>
    /// <para>Bước 7: Đếm tổng số báo cáo hợp lệ sau mốc RestoredAt (hoặc CreatedAt).</para>
    /// <para>Bước 8: Áp dụng RULE 5 (AUTO-HIDE TRIGGER): Nếu recentReportsCount >= 5 -> Đổi trạng thái sang HIDDEN_BY_REPORTS.</para>
    /// <para>Bước 9: Lưu thay đổi CSDL và trả về true.</para>
    /// </summary>
    public async Task<bool> CreateReportAsync(int reporterId, CreateReportRequest request)
    {
        // [BƯỚC 1]: Chuẩn hóa và kiểm tra loại đối tượng báo cáo
        var targetType = request.TargetType.ToUpper();
        if (targetType != "POST" && targetType != "COMMENT")
        {
            throw new InvalidOperationException("Loại báo cáo không hợp lệ. Phải là POST hoặc COMMENT.");
        }

        // [BƯỚC 2.A]: Nhánh xử lý BÁO CÁO BÀI VIẾT (POST)
        if (targetType == "POST")
        {
            if (!request.PostId.HasValue || request.PostId.Value <= 0)
                throw new InvalidOperationException("Thiếu ID bài viết.");

            var post = await _context.ForumPosts.FirstOrDefaultAsync(p => p.PostId == request.PostId.Value);
            if (post is null || post.Status == "DELETED")
                throw new InvalidOperationException("Bài viết không tồn tại.");

            // [RULE 1]: Nghiêm cấm tác giả tự báo cáo bài viết của chính mình
            if (post.AuthorId == reporterId)
            {
                throw new InvalidOperationException("Bạn không thể báo cáo bài viết của chính mình.");
            }

            // [RULE 2]: Không nhận báo cáo nếu bài viết đã ở trạng thái ẩn hoặc chờ duyệt
            if (post.Status != "PUBLISHED")
            {
                throw new InvalidOperationException("Bài viết này đã ở trạng thái tạm ẩn hoặc chờ duyệt.");
            }

            // [RULE 3]: Kiểm tra chống spam - Mỗi người dùng chỉ được gửi 1 báo cáo duy nhất cho mỗi bài viết
            var hasReported = await _context.ForumReports
                .AnyAsync(r => r.ReporterId == reporterId && r.TargetType == "POST" && r.PostId == request.PostId.Value);

            if (hasReported)
            {
                throw new InvalidOperationException("Bạn đã báo cáo bài viết này trước đây.");
            }

            // [BƯỚC 6]: Tạo thực thể báo cáo mới
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

            // [RULE 4]: Đếm số báo cáo phát sinh sau mốc thời gian khôi phục gần nhất (RestoredAt ?? CreatedAt)
            // Nhằm đảm bảo nếu Admin đã từng duyệt và mở lại bài viết thì các báo cáo cũ không bị tính dồn vào lần này
            var thresholdDate = post.RestoredAt ?? post.CreatedAt;
            var recentReportsCount = await _context.ForumReports
                .CountAsync(r => r.TargetType == "POST" && r.PostId == request.PostId.Value && r.CreatedAt >= thresholdDate && r.Status == "PENDING") + 1;

            post.ReportsCount = recentReportsCount;

            // [RULE 5]: CƠ CHẾ TỰ ĐỘNG ẨN (AUTO-HIDE TRIGGER):
            // Nếu bài viết nhận đủ từ 5 báo cáo độc lập từ người dùng trở lên, hệ thống tự động cách ly
            // bằng cách chuyển trạng thái sang "HIDDEN_BY_REPORTS" ngay lập tức để bảo vệ cộng đồng
            if (recentReportsCount >= 5)
            {
                post.Status = "HIDDEN_BY_REPORTS";
                post.UpdatedAt = DateTime.UtcNow;
            }

            // Lưu thay đổi trạng thái bài viết và bản ghi báo cáo vào CSDL
            _context.ForumPosts.Update(post);
            await _context.SaveChangesAsync();
            return true;
        }
        // [BƯỚC 2.B]: Nhánh xử lý BÁO CÁO BÌNH LUẬN (COMMENT)
        else
        {
            if (!request.CommentId.HasValue || request.CommentId.Value <= 0)
                throw new InvalidOperationException("Thiếu ID bình luận.");

            var comment = await _context.ForumComments.FirstOrDefaultAsync(c => c.CommentId == request.CommentId.Value);
            if (comment is null || comment.Status == "DELETED")
                throw new InvalidOperationException("Bình luận không tồn tại.");

            // [RULE 1]: Nghiêm cấm tác giả tự báo cáo bình luận của chính mình
            if (comment.AuthorId == reporterId)
            {
                throw new InvalidOperationException("Bạn không thể báo cáo bình luận của chính mình.");
            }

            // [RULE 2]: Không nhận báo cáo nếu bình luận đã bị ẩn
            if (comment.Status != "ACTIVE")
            {
                throw new InvalidOperationException("Bình luận này đã ở trạng thái tạm ẩn hoặc chờ duyệt.");
            }

            // [RULE 3]: Mỗi người chỉ được báo cáo 1 lần
            var hasReported = await _context.ForumReports
                .AnyAsync(r => r.ReporterId == reporterId && r.TargetType == "COMMENT" && r.CommentId == request.CommentId.Value);

            if (hasReported)
            {
                throw new InvalidOperationException("Bạn đã báo cáo bình luận này trước đây.");
            }

            // Tạo bản ghi báo cáo bình luận
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

            // Đếm số lượng báo cáo sau mốc khôi phục
            var thresholdDate = comment.RestoredAt ?? comment.CreatedAt;
            var recentReportsCount = await _context.ForumReports
                .CountAsync(r => r.TargetType == "COMMENT" && r.CommentId == request.CommentId.Value && r.CreatedAt >= thresholdDate && r.Status == "PENDING") + 1;

            comment.ReportsCount = recentReportsCount;

            // [RULE 5]: Tự động ẩn bình luận nếu đạt ngưỡng 5 báo cáo vi phạm
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
