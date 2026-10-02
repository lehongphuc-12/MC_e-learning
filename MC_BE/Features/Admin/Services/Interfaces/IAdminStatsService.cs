using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Features.Admin.DTOs;

namespace MC_BE.Features.Admin.Services.Interfaces;

public interface IAdminStatsService
{
    Task<AdminStatsDto> GetDashboardStatsAsync();
    Task<List<RevenueDataPointDto>> GetRevenueChartAsync();
    Task<List<SystemLogDto>> GetSystemLogsAsync();
    Task<PlatformSettingsDto> GetPlatformSettingsAsync();
    Task<bool> UpdatePlatformSettingsAsync(PlatformSettingsDto settings);
}
