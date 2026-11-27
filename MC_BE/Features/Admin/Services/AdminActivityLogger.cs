using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Admin.Services;

public sealed class AdminActivityLogger(SmartMcDbContext db, ILogger<AdminActivityLogger> logger)
{
    public async Task RecordAsync(int? actorId, string action, string entityType, string? entityId, string summary, string? correlationId = null, int? relatedUserId = null)
    {
        AdminActivityLog? entry = null;
        try
        {
            var actorName = actorId.HasValue
                ? await db.Users.AsNoTracking().Where(x => x.UserId == actorId.Value).Select(x => x.FullName).FirstOrDefaultAsync() ?? "Admin"
                : "System";
            entry = new AdminActivityLog { ActorUserId = actorId, ActorName = actorName,
                Action = action, EntityType = entityType, EntityId = entityId, Summary = summary,
                CorrelationId = correlationId, RelatedUserId = relatedUserId };
            db.AdminActivityLogs.Add(entry);
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            if (entry != null) db.Entry(entry).State = EntityState.Detached;
            logger.LogError(ex, "Unable to persist admin activity log for {Action} {EntityType} {EntityId}", action, entityType, entityId);
        }
    }
}
