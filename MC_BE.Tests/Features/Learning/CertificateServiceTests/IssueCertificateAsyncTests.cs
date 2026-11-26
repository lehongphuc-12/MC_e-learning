using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Learning.CertificateServiceTests;

public class IssueCertificateAsyncTests : CertificateServiceTestBase
{
    [Fact]
    public async Task IssueCertificateAsync_WhenRequirementsMet_IssuesCertificateAndRevokesGifts()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        var instructor = CreateUser(10, "Instructor", "instructor@example.com", "Instructor");
        var learner = CreateUser(learnerId, "Learner", "learner@example.com");
        var course = CreateCourse(courseId, instructor.UserId, "Course");
        var enr = CreateEnrollment(1, learnerId, courseId, course: course, learner: learner);

        var lesson1 = CreateLesson(1, courseId);
        var lesson2 = CreateLesson(2, courseId);

        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true, status: LessonProgressStatus.COMPLETED);
        CreateLessonProgress(2, enr.EnrollmentId, lesson2.LessonId, isCompleted: true, status: LessonProgressStatus.COMPLETED);

        // Act
        var result = await Service.IssueCertificateAsync(learnerId, courseId);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateCode.Should().StartWith($"CERT-{DateTime.UtcNow.Year}-");
        result.Status.Should().Be("ACTIVE");
        result.Grade.Should().Be("EXCELLENT");
        result.CompletionPercentage.Should().Be(100.00m);

        CertificateRepoMock.Verify(r => r.AddAsync(It.Is<Certificate>(c => c.EnrollmentId == enr.EnrollmentId)), Times.Once);
        CourseGiftAccessMock.Verify(g => g.RevokeGiftGrantsForCompletedEnrollmentAsync(enr.EnrollmentId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task IssueCertificateAsync_WhenCertificateAlreadyIssued_ReturnsExistingCertificateWithoutReissuing()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        var course = CreateCourse(courseId, 10);
        var enr = CreateEnrollment(1, learnerId, courseId, course: course);
        var existingCert = CreateCertificate(5, enr.EnrollmentId, "CERT-2026-ALREADY-EXISTS", enrollment: enr);

        // Act
        var result = await Service.IssueCertificateAsync(learnerId, courseId);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateId.Should().Be(existingCert.CertificateId);
        result.CertificateCode.Should().Be("CERT-2026-ALREADY-EXISTS");

        // Verify idempotency: did NOT add new cert or save changes
        CertificateRepoMock.Verify(r => r.AddAsync(It.IsAny<Certificate>()), Times.Never);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Never);
    }

    [Fact]
    public async Task IssueCertificateAsync_WhenLearnerCannotAccessCourse_ThrowsInvalidOperationException()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        CourseAccessMock
            .Setup(c => c.CanAccessCourseAsync(courseId, learnerId, false))
            .ReturnsAsync(false);

        // Act
        var act = () => Service.IssueCertificateAsync(learnerId, courseId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Learner does not currently have access to this course.");
    }

    [Fact]
    public async Task IssueCertificateAsync_WhenLearnerNotEnrolled_ThrowsArgumentException()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;

        // Act
        var act = () => Service.IssueCertificateAsync(learnerId, courseId);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Learner is not enrolled in this course.");
    }

    [Fact]
    public async Task IssueCertificateAsync_WhenLessonsIncompleteAndEnrollmentUnder100Percent_ThrowsInvalidOperationException()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        var course = CreateCourse(courseId, 10);
        var enr = CreateEnrollment(1, learnerId, courseId, completionPercentage: 50.00m, course: course);

        var lesson1 = CreateLesson(1, courseId);
        var lesson2 = CreateLesson(2, courseId);

        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true, status: LessonProgressStatus.COMPLETED);
        // Only 1 out of 2 lessons completed

        // Act
        var act = () => Service.IssueCertificateAsync(learnerId, courseId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Cannot issue certificate. Course completion is only 50.0%.");
    }

    [Fact]
    public async Task IssueCertificateAsync_WhenCertificateAccessCheckFails_ThrowsInvalidOperationException()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        var course = CreateCourse(courseId, 10);
        var enr = CreateEnrollment(1, learnerId, courseId, completionPercentage: 100.00m, course: course);

        var lesson1 = CreateLesson(1, courseId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true, status: LessonProgressStatus.COMPLETED);

        AccessMock
            .Setup(a => a.CheckCertificateAsync(learnerId, courseId))
            .ReturnsAsync((false, "Mandatory quiz score is below requirement."));

        // Act
        var act = () => Service.IssueCertificateAsync(learnerId, courseId);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Mandatory quiz score is below requirement.");
    }

    [Fact]
    public async Task IssueCertificateAsync_WhenTotalLessonsIsZero_IssuesCertificateSuccessfully()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        var course = CreateCourse(courseId, 10);
        var enr = CreateEnrollment(1, learnerId, courseId, completionPercentage: 100.00m, course: course);
        // Lessons list is empty for this course

        // Act
        var result = await Service.IssueCertificateAsync(learnerId, courseId);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateCode.Should().StartWith($"CERT-{DateTime.UtcNow.Year}-");
        CertificateRepoMock.Verify(r => r.AddAsync(It.IsAny<Certificate>()), Times.Once);
        UnitOfWorkMock.Verify(u => u.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task IssueCertificateAsync_WhenEnrollmentCompletionPercentageIs100EvenIfCompletedLessonsLessThanTotal_IssuesSuccessfully()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        var course = CreateCourse(courseId, 10);
        // Enrollment has completionPercentage == 100.00m
        var enr = CreateEnrollment(1, learnerId, courseId, completionPercentage: 100.00m, course: course);

        var lesson1 = CreateLesson(1, courseId);
        var lesson2 = CreateLesson(2, courseId);
        // Only lesson1 is completed in progress table, but enrollment is 100%
        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true, status: LessonProgressStatus.COMPLETED);

        // Act
        var result = await Service.IssueCertificateAsync(learnerId, courseId);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateCode.Should().StartWith($"CERT-{DateTime.UtcNow.Year}-");
    }
}
