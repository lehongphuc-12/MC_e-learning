using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MC_BE.Services;

/// <summary>
/// Tiến trình ngầm tự động quét định kỳ các khóa học đã hết hạn 90 ngày và chuyển sang EXPIRED
/// </summary>
public class EnrollmentExpirationWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EnrollmentExpirationWorker> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(30);

    public EnrollmentExpirationWorker(
        IServiceProvider serviceProvider,
        ILogger<EnrollmentExpirationWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(">>> [TỰ ĐỘNG HẾT HẠN] Tiến trình kiểm tra hạn khóa học 3 tháng đã khởi động.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessExpiredEnrollmentsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, ">>> [LỖI WORKER] Có lỗi xảy ra khi quét khóa học hết hạn.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }
    }

    private async Task ProcessExpiredEnrollmentsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SmartMcDbContext>();

        var now = DateTime.UtcNow;

        var expiredEnrollments = await context.Enrollments
            .Where(e => e.Status == "ACTIVE" && e.ExpiresAt.HasValue && e.ExpiresAt.Value <= now)
            .ToListAsync();

        if (expiredEnrollments.Count > 0)
        {
            _logger.LogInformation($">>> [HẾT HẠN TỰ ĐỘNG] Tìm thấy {expiredEnrollments.Count} khóa học đã hết hạn 3 tháng. Đang xử lý...");

            foreach (var enrollment in expiredEnrollments)
            {
                enrollment.Status = "EXPIRED";
                enrollment.UpdatedAt = now;
                context.Enrollments.Update(enrollment);
            }

            await context.SaveChangesAsync();
            _logger.LogInformation($">>> [THÀNH CÔNG] Đã chuyển trạng thái {expiredEnrollments.Count} khóa học sang EXPIRED.");
        }
    }
}