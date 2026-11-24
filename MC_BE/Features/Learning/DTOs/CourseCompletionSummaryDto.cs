using System;
using System.Collections.Generic;

namespace MC_BE.Features.Learning.DTOs;

/// <summary>
/// DTO response cho API Tổng kết cuối khóa (Course Completion Summary).
/// </summary>
public class CourseCompletionSummaryDto
{
    /// <summary>
    /// Trạng thái mở khóa báo cáo: true khi hoàn thành 100% khóa học hoặc đã cấp chứng chỉ.
    /// </summary>
    public bool IsUnlocked { get; set; }

    /// <summary>
    /// Tiến độ hoàn thành khóa học hiện tại (0 - 100%).
    /// </summary>
    public decimal CurrentProgress { get; set; }

    /// <summary>
    /// Thông điệp hiển thị cho học viên.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// 1. Tổng quan & Hành trình vượt khó.
    /// </summary>
    public CourseCompletionOverviewDto? Overview { get; set; }

    /// <summary>
    /// 2. So sánh Trước & Sau khóa học (Initial vs Final speaking).
    /// </summary>
    public BeforeAfterComparisonDto? BeforeAfterComparison { get; set; }

    /// <summary>
    /// 3. Biểu đồ tăng trưởng & Chi tiết Rubric.
    /// </summary>
    public GrowthMetricsDto? GrowthMetrics { get; set; }

    /// <summary>
    /// 4. Nhật ký nhận xét của Giảng viên (từ đầu đến cuối khóa).
    /// </summary>
    public List<FeedbackTimelineItemDto> FeedbackTimeline { get; set; } = new();
}

/// <summary>
/// Phần 1: Tổng quan khóa học & Hành trình vượt khó.
/// </summary>
public class CourseCompletionOverviewDto
{
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public double FinalScore { get; set; }
    public int? CertificateId { get; set; }
    public string? CertificateUrl { get; set; }
    public int RemedialCount { get; set; }
    public int PassedRemedialCount { get; set; }
    public string JourneySummaryText { get; set; } = string.Empty;
}

/// <summary>
/// Phần 2: So sánh Trước & Sau.
/// </summary>
public class BeforeAfterComparisonDto
{
    public SubmissionComparisonItemDto? InitialSubmission { get; set; }
    public SubmissionComparisonItemDto? FinalSubmission { get; set; }
}

/// <summary>
/// Chi tiết bài nộp trong So sánh Trước & Sau.
/// </summary>
public class SubmissionComparisonItemDto
{
    public int SubmissionId { get; set; }
    public string AssignmentTitle { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public double Score { get; set; }
    public string InstructorFeedback { get; set; } = string.Empty;
}

/// <summary>
/// Phần 3: Biểu đồ tăng trưởng và Phân tích Rubric.
/// </summary>
public class GrowthMetricsDto
{
    public List<ScoreTimelineItemDto> ScoreTimeline { get; set; } = new();
    public List<RubricBreakdownItemDto> RubricBreakdown { get; set; } = new();
}

/// <summary>
/// Từng điểm mốc trên biểu đồ tiến trình điểm số theo thời gian.
/// </summary>
public class ScoreTimelineItemDto
{
    public int SubmissionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Scope { get; set; } = string.Empty;
    public bool IsRemedial { get; set; }
    public double Score { get; set; }
    public DateTime SubmittedAt { get; set; }
}

/// <summary>
/// So sánh điểm của từng tiêu chí Rubric giữa lần đầu và lần cuối trong khóa học.
/// </summary>
public class RubricBreakdownItemDto
{
    public string CriterionName { get; set; } = string.Empty;
    public double InitialScore { get; set; }
    public double FinalScore { get; set; }
    public double MaxScore { get; set; } = 100;
    public double ImprovementDelta { get; set; }
}

/// <summary>
/// Phần 4: Nhật ký nhận xét của Giảng viên.
/// </summary>
public class FeedbackTimelineItemDto
{
    public int SubmissionId { get; set; }
    public string AssignmentTitle { get; set; } = string.Empty;
    public bool IsRemedial { get; set; }
    public double? Score { get; set; }
    public string InstructorFeedback { get; set; } = string.Empty;
    public DateTime? GradedAt { get; set; }
}
