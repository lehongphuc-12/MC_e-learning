
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Enums;
using MC_BE.Features.Admin.DTOs;
using MC_BE.Features.Admin.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Admin.Services;

public class AdminStatsService : IAdminStatsService
{
    private readonly SmartMcDbContext _context;

    // In-memory cache for settings during app runtime
    private static PlatformSettingsDto _settings = new PlatformSettingsDto();

    public AdminStatsService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<AdminStatsDto> GetDashboardStatsAsync()
    {
        var totalUsers = await _context.Users.CountAsync();

        var roles = await _context.Roles.AsNoTracking().ToListAsync();

        var instructorRoleIds = roles
            .Where(r =>
                r.RoleName.Contains("Instructor", StringComparison.OrdinalIgnoreCase) ||
                r.RoleName.Contains("Giảng viên", StringComparison.OrdinalIgnoreCase))
            .Select(r => r.RoleId)
            .ToList();

        var adminRoleIds = roles
            .Where(r =>
                r.RoleName.Contains("Admin", StringComparison.OrdinalIgnoreCase))
            .Select(r => r.RoleId)
            .ToList();

        var studentCount = await _context.Users
            .CountAsync(u =>
                !instructorRoleIds.Contains(u.RoleId) &&
                !adminRoleIds.Contains(u.RoleId));

        var instructorCount = await _context.Users
            .CountAsync(u => instructorRoleIds.Contains(u.RoleId));

        var totalCourses = await _context.Courses.CountAsync();

        var pendingCourseApprovals = await _context.Courses
            .CountAsync(c => c.Status == CourseStatus.PENDING_APPROVAL);

        var successfulPayments = await _context.Payments
            .Where(p => p.Status == "SUCCESS" || p.Status == "COMPLETED")
            .ToListAsync();

        decimal totalRevenue = successfulPayments.Sum(p => p.Amount);

        // Fallback: If no payment records in DB yet,
        // compute potential revenue from paid course enrollments.
        if (totalRevenue == 0)
        {
            var enrolledCourses = await _context.Enrollments
                .Include(e => e.Course)
                .Where(e => e.Status == "ACTIVE" && e.Course != null)
                .ToListAsync();

            totalRevenue = enrolledCourses.Sum(e => e.Course?.Price ?? 0);
        }

        return new AdminStatsDto
        {
            TotalRevenue = totalRevenue,
            RevenueGrowth = 18.5,
            TotalUsers = totalUsers,
            UsersGrowth = 12.3,
            ActiveStudents = studentCount,
            TotalInstructors = instructorCount,
            TotalCourses = totalCourses,
            CoursesGrowth = 8.7,
            PendingCourseApprovals = pendingCourseApprovals,
            PendingPayoutsCount = 0,
            PendingPayoutsAmount = 0
        };
    }

    public async Task<List<RevenueDataPointDto>> GetRevenueChartAsync(int? year = null)
    {
        var result = new List<RevenueDataPointDto>();
        var now = DateTime.UtcNow;

        // Có chọn năm: lấy đủ 12 tháng.
        // Không chọn năm: lấy 6 tháng gần nhất.
        int totalMonths = year.HasValue ? 12 : 6;

        for (int i = 0; i < totalMonths; i++)
        {
            var targetMonthDate = year.HasValue
                ? new DateTime(
                    year.Value,
                    i + 1,
                    1,
                    0,
                    0,
                    0,
                    DateTimeKind.Utc)
                : now.AddMonths(i - 5);

            // Đổi tên để không trùng với tham số year.
            int targetYear = targetMonthDate.Year;
            int targetMonth = targetMonthDate.Month;

            string monthLabel = $"T{targetMonth}/{targetYear}";

            // Lấy doanh thu thanh toán thành công trong tháng.
            var monthlyPayments = await _context.Payments
                .AsNoTracking()
                .Where(p =>
                    (p.Status == "SUCCESS" || p.Status == "COMPLETED") &&
                    p.CreatedAt.Year == targetYear &&
                    p.CreatedAt.Month == targetMonth)
                .ToListAsync();

            decimal monthRevenue = monthlyPayments.Sum(p => p.Amount);

            // Đếm lượt đăng ký khóa học trong tháng.
            int enrollmentsCount = await _context.Enrollments
                .AsNoTracking()
                .CountAsync(e =>
                    e.CreatedAt.Year == targetYear &&
                    e.CreatedAt.Month == targetMonth);

            result.Add(new RevenueDataPointDto
            {
                Month = monthLabel,
                Revenue = monthRevenue,
                Enrollments = enrollmentsCount
            });
        }

        return result;
    }

    public async Task<List<SystemLogDto>> GetSystemLogsAsync()
    {
        return await _context.AdminActivityLogs.AsNoTracking()
            .OrderByDescending(x => x.OccurredAt).ThenByDescending(x => x.Id).Take(10)
            .Select(x => new SystemLogDto
            {
                Id = x.Id.ToString(), Timestamp = x.OccurredAt.ToString("yyyy-MM-dd HH:mm:ss"),
                Action = x.Action, PerformedBy = x.ActorName, Details = x.Summary,
                Type = x.Result == "SUCCESS" ? "success" : "info"
            }).ToListAsync();
    }

    public Task<PlatformSettingsDto> GetPlatformSettingsAsync()
    {
        return Task.FromResult(_settings);
    }

    public Task<bool> UpdatePlatformSettingsAsync(PlatformSettingsDto settings)
    {
        _settings = settings;
        return Task.FromResult(true);
    }
}
