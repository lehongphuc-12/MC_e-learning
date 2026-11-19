using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Features.VoiceJourney.Entities;
namespace MC_BE.Features.VoiceJourney.Services;
public interface IVoiceAiEntitlementService
{
    Task<bool> HasActiveEntitlementAsync(int learnerId, DateTime? utcNow = null, CancellationToken ct = default);
    Task<IReadOnlyList<VoiceAiEntitlement>> GetEntitlementsAsync(int learnerId, CancellationToken ct = default);
    Task<int> ExpireDueEntitlementsAsync(DateTime utcNow, CancellationToken ct = default);
}
