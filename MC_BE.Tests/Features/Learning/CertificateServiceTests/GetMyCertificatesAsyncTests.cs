using System;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.CertificateServiceTests;

public class GetMyCertificatesAsyncTests : CertificateServiceTestBase
{
    [Fact]
    public async Task GetMyCertificatesAsync_WhenActiveCertificatesExist_ReturnsMappedDtosOrderedByIssuedAtDescending()
    {
        // Arrange
        var learnerId = 1;
        var otherLearnerId = 2;

        var learner = CreateUser(learnerId, "Alice Learner", "alice@example.com");
        var otherLearner = CreateUser(otherLearnerId, "Bob Learner", "bob@example.com");
        var instructor = CreateUser(10, "John Instructor", "instructor@example.com", "Instructor");

        var course1 = CreateCourse(101, instructor.UserId, "Course 1");
        var course2 = CreateCourse(102, instructor.UserId, "Course 2");
        var course3 = CreateCourse(103, instructor.UserId, "Course 3");

        var enr1 = CreateEnrollment(1, learnerId, course1.CourseId, course: course1, learner: learner);
        var enr2 = CreateEnrollment(2, learnerId, course2.CourseId, course: course2, learner: learner);
        var enr3 = CreateEnrollment(3, learnerId, course3.CourseId, course: course3, learner: learner);
        var otherEnr = CreateEnrollment(4, otherLearnerId, course1.CourseId, course: course1, learner: otherLearner);

        // Certs for learner: 2 ACTIVE (different dates) and 1 REVOKED
        var olderDate = DateTime.UtcNow.AddDays(-10);
        var newerDate = DateTime.UtcNow.AddDays(-1);
        CreateCertificate(1, enr1.EnrollmentId, "CERT-2026-001", status: "ACTIVE", issuedAt: olderDate, enrollment: enr1);
        CreateCertificate(2, enr2.EnrollmentId, "CERT-2026-002", status: "ACTIVE", issuedAt: newerDate, enrollment: enr2);
        CreateCertificate(3, enr3.EnrollmentId, "CERT-2026-003", status: "REVOKED", issuedAt: DateTime.UtcNow, enrollment: enr3);

        // Cert for other learner
        CreateCertificate(4, otherEnr.EnrollmentId, "CERT-2026-004", status: "ACTIVE", issuedAt: DateTime.UtcNow, enrollment: otherEnr);

        // Act
        var result = await Service.GetMyCertificatesAsync(learnerId);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2);

        // Order: newest issued first
        result[0].CertificateCode.Should().Be("CERT-2026-002");
        result[0].LearnerName.Should().Be("Alice Learner");
        result[0].CourseTitle.Should().Be("Course 2");
        result[0].InstructorName.Should().Be("John Instructor");
        result[0].Status.Should().Be("ACTIVE");

        result[1].CertificateCode.Should().Be("CERT-2026-001");
        result[1].CourseTitle.Should().Be("Course 1");
    }

    [Fact]
    public async Task GetMyCertificatesAsync_WhenLearnerHasOnlyRevokedOrInactiveCertificates_ReturnsEmptyList()
    {
        // Arrange
        var learnerId = 1;
        var enr = CreateEnrollment(1, learnerId, 101);
        CreateCertificate(1, enr.EnrollmentId, "CERT-2026-REVOKED", status: "REVOKED", enrollment: enr);
        CreateCertificate(2, enr.EnrollmentId, "CERT-2026-INACTIVE", status: "INACTIVE", enrollment: enr);

        // Act
        var result = await Service.GetMyCertificatesAsync(learnerId);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMyCertificatesAsync_WhenLearnerHasNoCertificates_ReturnsEmptyList()
    {
        // Arrange
        var learnerId = 99;

        // Act
        var result = await Service.GetMyCertificatesAsync(learnerId);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }
}
