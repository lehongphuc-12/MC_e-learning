using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningProgressServiceTests;

public class GetCourseCompletionSummaryAsyncTests : LearningProgressServiceTestBase
{
    [Fact]
    public async Task GetCourseCompletionSummaryAsync_WhenNotEnrolled_ReturnsNull()
    {
        // Arrange
        var learnerId = 99;
        var courseId = 100;

        // Act
        var result = await Service.GetCourseCompletionSummaryAsync(learnerId, courseId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCourseCompletionSummaryAsync_WhenProgressUnder100_ReturnsIsUnlockedFalse()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId, completionPercentage: 50.0m);
        var lesson1 = CreateLesson(1, course.CourseId);
        var lesson2 = CreateLesson(2, course.CourseId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true);

        AccessMock
            .Setup(a => a.CheckCertificateAsync(learnerId, course.CourseId))
            .ReturnsAsync((false, "Chưa hoàn thành toàn bộ bài học."));

        // Act
        var result = await Service.GetCourseCompletionSummaryAsync(learnerId, course.CourseId);

        // Assert
        result.Should().NotBeNull();
        result!.IsUnlocked.Should().BeFalse();
        result.CurrentProgress.Should().Be(50.0m);
        result.Message.Should().Contain("Hoàn thành 100% khóa học");
        result.Overview.Should().BeNull();
        result.BeforeAfterComparison.Should().BeNull();
        result.GrowthMetrics.Should().BeNull();
    }

    [Fact]
    public async Task GetCourseCompletionSummaryAsync_WhenCompleted_ReturnsUnlockedSummaryWithAll4Sections()
    {
        // Arrange
        var learnerId = 2;
        var course = CreateCourse(200, title: "Luyện giọng MC Chuyên Nghiệp");
        var enr = CreateEnrollment(2, learnerId, course.CourseId, status: "COMPLETED", completionPercentage: 100.0m);

        var lesson1 = CreateLesson(21, course.CourseId, title: "Bài 1: Giới thiệu");
        CreateLessonProgress(21, enr.EnrollmentId, lesson1.LessonId, isCompleted: true);

        // Submissions
        var scriptInitial = CreateSpeakingScript(31, course.CourseId, title: "Khởi động giọng nói");
        scriptInitial.Scope = SpeakingScope.LESSON;
        DbContext.SaveChanges();

        var scriptFinal = CreateSpeakingScript(32, course.CourseId, title: "Dẫn chương trình chung kết");
        scriptFinal.Scope = SpeakingScope.FINAL;
        DbContext.SaveChanges();

        var sub1 = new SpeakingSubmission
        {
            SubmissionId = 101,
            LearnerId = learnerId,
            ScriptId = scriptInitial.ScriptId,
            Score = 75.0m,
            AudioUrl = "https://audio.com/sub1.mp3",
            Status = SpeakingSubmissionStatus.GRADED,
            Feedback = "Cần mở khẩu hình to hơn.\n<!--RUBRIC_SCORES:[{\"Code\":\"C01\",\"Name\":\"Phát âm\",\"Score\":70.0},{\"Code\":\"C02\",\"Name\":\"Ngữ điệu\",\"Score\":80.0}]-->",
            SubmittedAt = DateTime.UtcNow.AddDays(-10),
            GradedAt = DateTime.UtcNow.AddDays(-9)
        };

        var sub2 = new SpeakingSubmission
        {
            SubmissionId = 102,
            LearnerId = learnerId,
            ScriptId = scriptFinal.ScriptId,
            Score = 95.0m,
            AudioUrl = "https://audio.com/sub2.mp3",
            Status = SpeakingSubmissionStatus.GRADED,
            Feedback = "Tiến bộ vượt bậc! Tông giọng rất truyền cảm.\n<!--RUBRIC_SCORES:[{\"Code\":\"C01\",\"Name\":\"Phát âm\",\"Score\":92.0},{\"Code\":\"C02\",\"Name\":\"Ngữ điệu\",\"Score\":98.0}]-->",
            SubmittedAt = DateTime.UtcNow.AddDays(-1),
            GradedAt = DateTime.UtcNow
        };

        DbContext.SpeakingSubmissions.AddRange(sub1, sub2);

        var cert = CreateCertificate(50, enr.EnrollmentId, "CERT-MC-200");
        cert.CertificateUrl = "https://mseek.com/certificates/CERT-MC-200.pdf";
        DbContext.SaveChanges();

        AccessMock
            .Setup(a => a.CheckCertificateAsync(learnerId, course.CourseId))
            .ReturnsAsync((true, null));

        // Act
        var result = await Service.GetCourseCompletionSummaryAsync(learnerId, course.CourseId);

        // Assert
        result.Should().NotBeNull();
        result!.IsUnlocked.Should().BeTrue();
        result.CurrentProgress.Should().Be(100.0m);

        // 1. Overview
        result.Overview.Should().NotBeNull();
        result.Overview!.CourseId.Should().Be(course.CourseId);
        result.Overview.CourseTitle.Should().Be("Luyện giọng MC Chuyên Nghiệp");
        result.Overview.FinalScore.Should().Be(85.0); // (75 + 95) / 2
        result.Overview.CertificateId.Should().Be(50);
        result.Overview.CertificateUrl.Should().Be("https://mseek.com/certificates/CERT-MC-200.pdf");
        result.Overview.RemedialCount.Should().Be(0);
        result.Overview.JourneySummaryText.Should().Contain("Phong độ ổn định: Bạn đã duy trì trạng thái An toàn (Xanh)");

        // 2. BeforeAfterComparison
        result.BeforeAfterComparison.Should().NotBeNull();
        result.BeforeAfterComparison!.InitialSubmission.Should().NotBeNull();
        result.BeforeAfterComparison.InitialSubmission!.SubmissionId.Should().Be(101);
        result.BeforeAfterComparison.InitialSubmission.Score.Should().Be(75.0);
        result.BeforeAfterComparison.InitialSubmission.InstructorFeedback.Should().Be("Cần mở khẩu hình to hơn.");

        result.BeforeAfterComparison.FinalSubmission.Should().NotBeNull();
        result.BeforeAfterComparison.FinalSubmission!.SubmissionId.Should().Be(102);
        result.BeforeAfterComparison.FinalSubmission.Score.Should().Be(95.0);
        result.BeforeAfterComparison.FinalSubmission.Scope.Should().Be("FINAL");
        result.BeforeAfterComparison.FinalSubmission.InstructorFeedback.Should().Be("Tiến bộ vượt bậc! Tông giọng rất truyền cảm.");

        // 3. GrowthMetrics
        result.GrowthMetrics.Should().NotBeNull();
        result.GrowthMetrics!.ScoreTimeline.Should().HaveCount(2);
        result.GrowthMetrics.ScoreTimeline[0].Score.Should().Be(75.0);
        result.GrowthMetrics.ScoreTimeline[1].Score.Should().Be(95.0);

        result.GrowthMetrics.RubricBreakdown.Should().HaveCount(2);
        var phatAm = result.GrowthMetrics.RubricBreakdown.Find(r => r.CriterionName == "Phát âm");
        phatAm.Should().NotBeNull();
        phatAm!.InitialScore.Should().Be(70.0);
        phatAm.FinalScore.Should().Be(92.0);
        phatAm.ImprovementDelta.Should().Be(22.0);

        var nguDieu = result.GrowthMetrics.RubricBreakdown.Find(r => r.CriterionName == "Ngữ điệu");
        nguDieu.Should().NotBeNull();
        nguDieu!.InitialScore.Should().Be(80.0);
        nguDieu.FinalScore.Should().Be(98.0);
        nguDieu.ImprovementDelta.Should().Be(18.0);

        // 4. FeedbackTimeline
        result.FeedbackTimeline.Should().HaveCount(2);
        result.FeedbackTimeline[0].SubmissionId.Should().Be(101);
        result.FeedbackTimeline[0].InstructorFeedback.Should().Be("Cần mở khẩu hình to hơn.");
        result.FeedbackTimeline[1].SubmissionId.Should().Be(102);
        result.FeedbackTimeline[1].InstructorFeedback.Should().Be("Tiến bộ vượt bậc! Tông giọng rất truyền cảm.");
    }

    [Fact]
    public async Task GetCourseCompletionSummaryAsync_WhenRemedialReceived_ShowsCorrectRemedialCountsAndText()
    {
        // Arrange
        var learnerId = 3;
        var course = CreateCourse(300);
        var enr = CreateEnrollment(3, learnerId, course.CourseId, status: "COMPLETED", completionPercentage: 100.0m);
        var cert = CreateCertificate(30, enr.EnrollmentId);

        // Remedial Assignment
        var remedialTask = new RemedialAssignment
        {
            RemedialAssignmentId = 1,
            CourseId = course.CourseId,
            Title = "Bổ trợ phát âm âm đuôi",
            Reason = "Điểm phát âm thấp",
            AssignedById = 1,
            IsActive = true
        };
        DbContext.RemedialAssignments.Add(remedialTask);

        var recipient = new RemedialAssignmentRecipient
        {
            RecipientId = 1,
            RemedialAssignmentId = remedialTask.RemedialAssignmentId,
            StudentId = learnerId,
            Status = "COMPLETED",
            CompletedAt = DateTime.UtcNow
        };
        DbContext.RemedialAssignmentRecipients.Add(recipient);

        var script = CreateSpeakingScript(301, course.CourseId);

        var sub = new SpeakingSubmission
        {
            SubmissionId = 301,
            LearnerId = learnerId,
            ScriptId = script.ScriptId,
            Score = 88.0m,
            AudioUrl = "https://audio.com/sub.mp3",
            Status = SpeakingSubmissionStatus.GRADED,
            SubmittedAt = DateTime.UtcNow
        };
        DbContext.SpeakingSubmissions.Add(sub);
        DbContext.SaveChanges();

        // Act
        var result = await Service.GetCourseCompletionSummaryAsync(learnerId, course.CourseId);

        // Assert
        result.Should().NotBeNull();
        result!.Overview.Should().NotBeNull();
        result.Overview!.RemedialCount.Should().Be(1);
        result.Overview.PassedRemedialCount.Should().Be(1);
        result.Overview.JourneySummaryText.Should().Contain("Bạn từng nhận 1 bài tập bổ trợ để khắc phục điểm yếu");
        result.Overview.JourneySummaryText.Should().Contain("điểm tổng kết 88/100");
    }

    [Fact]
    public async Task GetCourseCompletionSummaryAsync_WhenSingleSubmission_InitialAndFinalMatch()
    {
        // Arrange
        var learnerId = 4;
        var course = CreateCourse(400);
        var enr = CreateEnrollment(4, learnerId, course.CourseId, status: "COMPLETED", completionPercentage: 100.0m);
        CreateCertificate(40, enr.EnrollmentId);

        var script = CreateSpeakingScript(401, course.CourseId);

        var sub = new SpeakingSubmission
        {
            SubmissionId = 401,
            LearnerId = learnerId,
            ScriptId = script.ScriptId,
            Score = 90.0m,
            AudioUrl = "https://audio.com/single.mp3",
            Status = SpeakingSubmissionStatus.GRADED,
            Feedback = "Làm rất tốt!",
            SubmittedAt = DateTime.UtcNow
        };
        DbContext.SpeakingSubmissions.Add(sub);
        DbContext.SaveChanges();

        // Act
        var result = await Service.GetCourseCompletionSummaryAsync(learnerId, course.CourseId);

        // Assert
        result.Should().NotBeNull();
        result!.BeforeAfterComparison.Should().NotBeNull();
        result.BeforeAfterComparison!.InitialSubmission.Should().NotBeNull();
        result.BeforeAfterComparison.FinalSubmission.Should().NotBeNull();
        result.BeforeAfterComparison.InitialSubmission!.SubmissionId.Should().Be(401);
        result.BeforeAfterComparison.FinalSubmission!.SubmissionId.Should().Be(401);
    }
}
