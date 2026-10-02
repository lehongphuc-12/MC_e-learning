using System;
using System.Collections.Generic;

namespace MC_BE.Features.Admin.DTOs;

public class AdminStatsDto
{
    public decimal TotalRevenue { get; set; }
    public double RevenueGrowth { get; set; }
    public int TotalUsers { get; set; }
    public double UsersGrowth { get; set; }
    public int ActiveStudents { get; set; }
    public int TotalInstructors { get; set; }
    public int TotalCourses { get; set; }
    public double CoursesGrowth { get; set; }
    public int PendingCourseApprovals { get; set; }
    public int PendingPayoutsCount { get; set; }
    public decimal PendingPayoutsAmount { get; set; }
}

public class RevenueDataPointDto
{
    public string Month { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Enrollments { get; set; }
}

public class SystemLogDto
{
    public string Id { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string Type { get; set; } = "info";
}

public class PlatformSettingsDto
{
    public string SiteName { get; set; } = "MSEEK Academy";
    public string SupportEmail { get; set; } = "support@mseek.edu.vn";
    public bool MaintenanceMode { get; set; } = false;
    public double CommissionRatePercent { get; set; } = 15.0;
    public decimal PayoutMinimum { get; set; } = 1000000;
    public bool AllowNewRegistrations { get; set; } = true;
    public bool RequireCourseApproval { get; set; } = true;
}
