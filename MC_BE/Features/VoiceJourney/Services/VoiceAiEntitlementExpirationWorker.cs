using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
namespace MC_BE.Features.VoiceJourney.Services;
public sealed class VoiceAiEntitlementExpirationWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<VoiceAiEntitlementExpirationWorker> _logger;
    public VoiceAiEntitlementExpirationWorker(IServiceScopeFactory scopeFactory, ILogger<VoiceAiEntitlementExpirationWorker> logger)
    { _scopeFactory = scopeFactory; _logger = logger; }
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        do
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<IVoiceAiEntitlementService>();
                var count = await service.ExpireDueEntitlementsAsync(DateTime.UtcNow, stoppingToken);
                if (count > 0) _logger.LogInformation("Expired {Count} AI Voice entitlements", count);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { _logger.LogError(ex, "Failed to expire AI Voice entitlements"); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
