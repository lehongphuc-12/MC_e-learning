using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Features.VoiceJourney.Entities;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
namespace MC_BE.Features.VoiceJourney.Services;
public sealed class VoiceAiEntitlementService : IVoiceAiEntitlementService
{
    private readonly SmartMcDbContext _db;
    public VoiceAiEntitlementService(SmartMcDbContext db) => _db = db;
    public Task<bool> HasActiveEntitlementAsync(int learnerId, DateTime? utcNow = null, CancellationToken ct = default)
    {
        var now = utcNow ?? DateTime.UtcNow;
        return _db.VoiceAiEntitlements.AsNoTracking().AnyAsync(x => x.LearnerId == learnerId && x.Status == "ACTIVE" && (!x.ExpiresAt.HasValue || x.ExpiresAt.Value > now), ct);
    }
    public async Task<IReadOnlyList<VoiceAiEntitlement>> GetEntitlementsAsync(int learnerId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var rows = await _db.VoiceAiEntitlements.AsNoTracking().Where(x => x.LearnerId == learnerId).OrderByDescending(x => x.GrantedAt).ToListAsync(ct);
        foreach (var row in rows) if (row.Status == "ACTIVE" && row.ExpiresAt.HasValue && row.ExpiresAt.Value <= now) row.Status = "EXPIRED";
        return rows;
    }
    public async Task<int> ExpireDueEntitlementsAsync(DateTime utcNow, CancellationToken ct = default)
    {
        var rows = await _db.VoiceAiEntitlements.Where(x => x.Status == "ACTIVE" && x.ExpiresAt.HasValue && x.ExpiresAt.Value <= utcNow).ToListAsync(ct);
        foreach (var row in rows) row.Status = "EXPIRED";
        if (rows.Count > 0) await _db.SaveChangesAsync(ct);
        return rows.Count;
    }
}
