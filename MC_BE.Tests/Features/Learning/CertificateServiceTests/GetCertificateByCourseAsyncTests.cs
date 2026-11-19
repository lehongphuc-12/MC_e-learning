using System;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.CertificateServiceTests;

public class GetCertificateByCourseAsyncTests : CertificateServiceTestBase
{
    [Fact]
    public async Task GetCertificateByCourseAsync_WhenActiveCertificateExists_ReturnsMappedCertificateDto()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        var instructor = CreateUser(10, "Master Trainer", "trainer@example.com", "Instructor");
        var learner = CreateUser(learnerId, "Jane Doe", "jane@example.com");
        var course = CreateCourse(courseId, instructor.UserId, "Public Speaking Pro");
        var enr = CreateEnrollment(1, learnerId, courseId, course: course, learner: learner);

        CreateCertificate(1, enr.EnrollmentId, "CERT-2026-ACTIVE", status: "ACTIVE", enrollment: enr);

        // Act
        var result = await Service.GetCertificateByCourseAsync(learnerId, courseId);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateCode.Should().Be("CERT-2026-ACTIVE");
        result.LearnerId.Should().Be(learnerId);
        result.LearnerName.Should().Be("Jane Doe");
        result.CourseId.Should().Be(courseId);
        result.CourseTitle.Should().Be("Public Speaking Pro");
        result.InstructorName.Should().Be("Master Trainer");
        result.Status.Should().Be("ACTIVE");
    }

    [Fact]
    public async Task GetCertificateByCourseAsync_WhenCertificateExistsButStatusNotActive_ReturnsNull()
    {
        // Arrange
        var learnerId = 1;
        var courseId = 100;
        var enr = CreateEnrollment(1, learnerId, courseId);
        CreateCertificate(1, enr.EnrollmentId, "CERT-2026-SUSPENDED", status: "SUSPENDED", enrollment: enr);

        // Act
        var result = await Service.GetCertificateByCourseAsync(learnerId, courseId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCertificateByCourseAsync_WhenNoCertificateExists_ReturnsNull()
    {
        // Arrange
        var learnerId = 1;
        var nonExistentCourseId = 999;

        // Act
        var result = await Service.GetCertificateByCourseAsync(learnerId, nonExistentCourseId);

        // Assert
        result.Should().BeNull();
    }
}
