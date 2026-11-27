using MC_BE.Core.Entities;
using MC_BE.Features.Admin.DTOs;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Admin.Services;

public sealed class AdminOperationsService(SmartMcDbContext db)
{
    public async Task<PagedItemsDto<ActivityLogItemDto>> GetLogsAsync(int page, int pageSize, string? category, string? search, string? action, string? entityType, DateTime? from, DateTime? to)
    {
        var query = db.AdminActivityLogs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(category))
        {
            if (category.Trim().Equals("SYSTEM", StringComparison.OrdinalIgnoreCase))
            {
                var categorizedTypes = new[] { "COURSE", "COURSE_DELETION_REQUEST", "USER", "PAYMENT", "ACCESS_EXTENSION_REQUEST",
                    "FORUM_REPORT", "FORUM_POST", "FORUM_COMMENT", "COURSE_REVIEW_REPORT", "COURSE_REVIEW",
                    "COURSE_REVIEW_RESTRICTION", "SUPPORT_REQUEST", "PLATFORM_SETTINGS", "COURSE_GIFT_POLICY" };
                query = query.Where(x => !categorizedTypes.Contains(x.EntityType));
            }
            else
            {
                var entityTypes = GetEntityTypesForCategory(category);
                if (entityTypes.Length == 0) query = query.Where(_ => false);
                else query = query.Where(x => entityTypes.Contains(x.EntityType));
            }
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.ActorName.Contains(term) || x.Summary.Contains(term) ||
                (x.EntityId != null && x.EntityId.Contains(term)) || x.Action.Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(x => x.Action == action);
        if (!string.IsNullOrWhiteSpace(entityType)) query = query.Where(x => x.EntityType == entityType);
        if (from.HasValue) query = query.Where(x => x.OccurredAt >= from.Value.ToUniversalTime());
        if (to.HasValue) query = query.Where(x => x.OccurredAt < to.Value.ToUniversalTime());
        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(x => x.OccurredAt).ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new { x.Id, x.OccurredAt, x.ActorUserId, x.ActorName, x.Action, x.EntityType, x.EntityId, x.Summary, x.Result }).ToListAsync();
        var items = rows.Select(x => new ActivityLogItemDto { Id = x.Id, OccurredAt = x.OccurredAt,
            Category = GetCategory(x.EntityType), ActorUserId = x.ActorUserId, ActorName = x.ActorName,
            Action = x.Action, EntityType = x.EntityType, EntityId = x.EntityId, Summary = x.Summary, Result = x.Result }).ToList();
        return new() { Items = items, Page = page, PageSize = pageSize, TotalItems = total, TotalPages = (int)Math.Ceiling(total / (double)pageSize) };
    }

    private static string[] GetEntityTypesForCategory(string category) => category.Trim().ToUpperInvariant() switch
    {
        "COURSES" => new[] { "COURSE", "COURSE_DELETION_REQUEST" },
        "USERS" => new[] { "USER" },
        "PAYMENTS_ACCESS" => new[] { "PAYMENT", "ACCESS_EXTENSION_REQUEST" },
        "MODERATION" => new[] { "FORUM_REPORT", "FORUM_POST", "FORUM_COMMENT", "COURSE_REVIEW_REPORT", "COURSE_REVIEW", "COURSE_REVIEW_RESTRICTION" },
        "SUPPORT" => new[] { "SUPPORT_REQUEST" },
        "SYSTEM_SETTINGS" => new[] { "PLATFORM_SETTINGS", "COURSE_GIFT_POLICY" },
        _ => Array.Empty<string>()
    };

    private static string GetCategory(string entityType) => entityType switch
    {
        "COURSE" or "COURSE_DELETION_REQUEST" => "COURSES",
        "USER" => "USERS",
        "PAYMENT" or "ACCESS_EXTENSION_REQUEST" => "PAYMENTS_ACCESS",
        "FORUM_REPORT" or "FORUM_POST" or "FORUM_COMMENT" or "COURSE_REVIEW_REPORT" or "COURSE_REVIEW" or "COURSE_REVIEW_RESTRICTION" => "MODERATION",
        "SUPPORT_REQUEST" => "SUPPORT",
        "PLATFORM_SETTINGS" or "COURSE_GIFT_POLICY" => "SYSTEM_SETTINGS",
        _ => "SYSTEM"
    };

    public async Task<PagedItemsDto<SupportRequestDto>> GetSupportRequestsAsync(int page, int pageSize, string? status, string? category, string? search)
    {
        var query = db.SupportRequests.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(x => x.Category == category);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.PublicCode.Contains(search) || x.Subject.Contains(search) || x.Requester!.FullName.Contains(search) || x.Requester.Email.Contains(search));
        var total = await query.CountAsync();
        var requests = await query.Include(x => x.Requester).Include(x => x.AssignedAdmin)
            .OrderBy(x => x.Status == "OPEN" ? 0 : x.Status == "IN_PROGRESS" ? 1 : x.Status == "WAITING_FOR_USER" ? 2 : 3)
            .ThenByDescending(x => x.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var items = requests.Select(x => Map(x)).ToList();
        return new() { Items = items, Page = page, PageSize = pageSize, TotalItems = total, TotalPages = (int)Math.Ceiling(total / (double)pageSize) };
    }

    public async Task<SupportRequestDto?> GetSupportRequestAsync(long id, bool includeInternal = true)
    {
        var item = await db.SupportRequests.AsNoTracking().Include(x => x.Requester).Include(x => x.AssignedAdmin)
            .Include(x => x.Messages).ThenInclude(x => x.Sender).FirstOrDefaultAsync(x => x.Id == id);
        return item == null ? null : Map(item, includeInternal);
    }

    public async Task<PagedItemsDto<SupportRequestDto>> GetMySupportRequestsAsync(int userId, int page, int pageSize)
    {
        var query = db.SupportRequests.AsNoTracking().Where(x => x.RequesterUserId == userId);
        var total = await query.CountAsync();
        var requests = await query.Include(x => x.Requester).Include(x => x.AssignedAdmin).Include(x => x.Messages).ThenInclude(x => x.Sender)
            .OrderByDescending(x => x.UpdatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new() { Items = requests.Select(x => Map(x, false)).ToList(), Page = page, PageSize = pageSize,
            TotalItems = total, TotalPages = (int)Math.Ceiling(total / (double)pageSize) };
    }

    public async Task<SupportRequestDto> CreateSupportRequestAsync(int requesterId, CreateSupportRequestDto input)
    {
        var subject = (input.Subject ?? string.Empty).Trim();
        var description = (input.Description ?? string.Empty).Trim();
        if (subject.Length is < 4 or > 160) throw new ArgumentException("Tiêu đề phải dài từ 4 đến 160 ký tự.");
        if (description.Length is < 10 or > 4000) throw new ArgumentException("Mô tả phải dài từ 10 đến 4000 ký tự.");
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == requesterId)
            ?? throw new InvalidOperationException("Không tìm thấy tài khoản.");
        var ticket = new SupportRequest
        {
            PublicCode = $"SUP-{Guid.NewGuid():N}"[..20].ToUpperInvariant(),
            RequesterUserId = requesterId, Category = NormalizeCategory(input.Category),
            Subject = subject, Description = description, Priority = "NORMAL", Status = "OPEN",
            RelatedCourseId = input.RelatedCourseId, RelatedPaymentId = input.RelatedPaymentId,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        db.SupportRequests.Add(ticket);
        db.AdminActivityLogs.Add(new AdminActivityLog { ActorUserId = requesterId, ActorName = user.FullName,
            Action = "SUPPORT_CREATED", EntityType = "SUPPORT_REQUEST", EntityId = ticket.PublicCode,
            Summary = $"Người dùng gửi yêu cầu hỗ trợ: {subject}", RelatedUserId = requesterId });
        var admins = await db.Users.AsNoTracking().Include(x => x.Role)
            .Where(x => x.Role.RoleName.ToLower().Contains("admin") && x.Status == "ACTIVE")
            .Select(x => x.UserId).ToListAsync();
        foreach (var adminId in admins)
            db.Notifications.Add(new Notification { UserId = adminId, Type = "support_request", Title = "Yêu cầu hỗ trợ mới", Message = $"{user.FullName}: {subject}", Url = "/admin?tab=support-requests" });
        await db.SaveChangesAsync();
        return (await GetSupportRequestAsync(ticket.Id, false))!;
    }

    public async Task<bool> AddReplyAsync(long id, int senderId, bool senderIsAdmin, SupportRequestReplyDto input)
    {
        var body = (input.Body ?? string.Empty).Trim();
        if (body.Length is < 1 or > 4000) throw new ArgumentException("Nội dung phản hồi không được để trống và tối đa 4000 ký tự.");
        var item = await db.SupportRequests.Include(x => x.Requester).FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return false;
        if (!senderIsAdmin && item.RequesterUserId != senderId) return false;
        if (!senderIsAdmin && input.IsInternalNote) throw new UnauthorizedAccessException();
        if ((item.Status is "CLOSED" or "RESOLVED") && !senderIsAdmin) item.Status = "OPEN";
        item.UpdatedAt = DateTime.UtcNow;
        db.SupportRequestMessages.Add(new SupportRequestMessage { SupportRequestId = id, SenderUserId = senderId, Body = body,
            IsInternalNote = senderIsAdmin && input.IsInternalNote, CreatedAt = DateTime.UtcNow });
        var senderName = await db.Users.Where(x => x.UserId == senderId).Select(x => x.FullName).FirstOrDefaultAsync() ?? "User";
        db.AdminActivityLogs.Add(new AdminActivityLog { ActorUserId = senderId, ActorName = senderName,
            Action = input.IsInternalNote ? "SUPPORT_INTERNAL_NOTE" : "SUPPORT_REPLY", EntityType = "SUPPORT_REQUEST",
            EntityId = item.PublicCode, Summary = input.IsInternalNote ? $"Ghi chú nội bộ ticket {item.PublicCode}" : $"Phản hồi ticket {item.PublicCode}" });
        if (!input.IsInternalNote)
        {
            if (senderIsAdmin)
                db.Notifications.Add(new Notification { UserId = item.RequesterUserId, Type = "support_reply", Title = "Admin đã phản hồi yêu cầu hỗ trợ", Message = $"Yêu cầu {item.PublicCode}: {body[..Math.Min(body.Length, 180)]}", Url = "/my-support" });
            else
            {
                var admins = await db.Users.AsNoTracking().Include(x => x.Role).Where(x => x.Role.RoleName.ToLower().Contains("admin") && x.Status == "ACTIVE").Select(x => x.UserId).ToListAsync();
                foreach (var adminId in admins)
                    db.Notifications.Add(new Notification { UserId = adminId, Type = "support_reply", Title = "Học viên phản hồi yêu cầu hỗ trợ", Message = $"{item.PublicCode}: {body[..Math.Min(body.Length, 180)]}", Url = "/admin?tab=support-requests" });
            }
        }
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateSupportRequestAsync(long id, int adminId, SupportRequestUpdateDto input)
    {
        var valid = new[] { "OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED" };
        var status = (input.Status ?? string.Empty).Trim().ToUpperInvariant();
        if (!valid.Contains(status)) throw new ArgumentException("Trạng thái ticket không hợp lệ.");
        if (status == "RESOLVED" && string.IsNullOrWhiteSpace(input.ResolutionNote))
            throw new ArgumentException("Vui lòng nhập ghi chú giải quyết trước khi đánh dấu đã giải quyết.");
        var item = await db.SupportRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return false;
        if (input.AssignedAdminId.HasValue && !await db.Users.Include(x => x.Role).AnyAsync(x => x.UserId == input.AssignedAdminId && x.Status == "ACTIVE" && x.Role.RoleName.ToLower().Contains("admin")))
            throw new ArgumentException("Người được phân công không phải Admin.");
        var priorStatus = item.Status;
        item.Status = status;
        item.AssignedAdminId = input.AssignedAdminId;
        item.UpdatedAt = DateTime.UtcNow;
        item.ResolutionNote = string.IsNullOrWhiteSpace(input.ResolutionNote) ? null : input.ResolutionNote.Trim()[..Math.Min(input.ResolutionNote.Trim().Length, 1000)];
        item.ResolvedAt = status is "RESOLVED" or "CLOSED" ? DateTime.UtcNow : null;
        item.ResolvedByAdminId = status is "RESOLVED" or "CLOSED" ? adminId : null;
        var adminName = await db.Users.Where(x => x.UserId == adminId).Select(x => x.FullName).FirstOrDefaultAsync() ?? "Admin";
        db.AdminActivityLogs.Add(new AdminActivityLog { ActorUserId = adminId, ActorName = adminName,
            Action = "SUPPORT_UPDATED", EntityType = "SUPPORT_REQUEST", EntityId = item.PublicCode,
            Summary = $"Cập nhật ticket {item.PublicCode}: {priorStatus} → {status}" });
        db.Notifications.Add(new Notification { UserId = item.RequesterUserId, Type = "support_status", Title = "Cập nhật yêu cầu hỗ trợ", Message = $"Yêu cầu {item.PublicCode} đang ở trạng thái {status}.", Url = "/my-support" });
        await db.SaveChangesAsync();
        return true;
    }

    private static string NormalizeCategory(string? category)
    {
        var value = category?.Trim().ToUpperInvariant();
        return value is "COURSE" or "PAYMENT" or "ACCOUNT" or "TECHNICAL" or "OTHER" ? value : "OTHER";
    }

    private static SupportRequestDto Map(SupportRequest x, bool includeInternal = true) => new()
    {
        Id = x.Id, PublicCode = x.PublicCode, RequesterUserId = x.RequesterUserId,
        RequesterName = x.Requester?.FullName ?? "", RequesterEmail = x.Requester?.Email ?? "",
        AssignedAdminId = x.AssignedAdminId, AssignedAdminName = x.AssignedAdmin?.FullName,
        Category = x.Category, Subject = x.Subject, Description = x.Description, Priority = x.Priority,
        Status = x.Status, ResolutionNote = x.ResolutionNote, CreatedAt = x.CreatedAt, UpdatedAt = x.UpdatedAt,
        Messages = x.Messages.Where(m => includeInternal || !m.IsInternalNote).OrderBy(m => m.CreatedAt)
            .Select(m => new SupportRequestMessageDto { Id = m.Id, SenderUserId = m.SenderUserId,
                SenderName = m.Sender?.FullName ?? "", Body = m.Body, IsInternalNote = m.IsInternalNote, CreatedAt = m.CreatedAt }).ToList()
    };
}
