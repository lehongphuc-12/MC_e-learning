using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.CertificateServiceTests;

public class GetCertificateByIdAsyncTests : CertificateServiceTestBase
{
    [Fact]
    public async Task GetCertificateByIdAsync_WhenRequestedByLearnerOwner_ReturnsCertificateDto()
    {
        // Arrange
        var learnerId = 1;
        var instructorId = 10;
        var instructor = CreateUser(instructorId, "Master Instructor", "instructor@example.com", "Instructor");
        var learner = CreateUser(learnerId, "Owner Learner", "owner@example.com");
        var course = CreateCourse(100, instructorId, "Advanced Speech");
        var enr = CreateEnrollment(1, learnerId, course.CourseId, course: course, learner: learner);
        var cert = CreateCertificate(50, enr.EnrollmentId, "CERT-2026-OWNER", enrollment: enr);

        // Act
        var result = await Service.GetCertificateByIdAsync(cert.CertificateId, currentUserId: learnerId);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateId.Should().Be(50);
        result.LearnerId.Should().Be(learnerId);
        result.CertificateCode.Should().Be("CERT-2026-OWNER");
    }

    [Fact]
    public async Task GetCertificateByIdAsync_WhenRequestedByCourseInstructor_ReturnsCertificateDto()
    {
        // Arrange
        var learnerId = 1;
        var instructorId = 10;
        var instructor = CreateUser(instructorId, "Master Instructor", "instructor@example.com", "Instructor");
        var learner = CreateUser(learnerId, "Student", "student@example.com");
        var course = CreateCourse(100, instructorId, "Advanced Speech");
        var enr = CreateEnrollment(1, learnerId, course.CourseId, course: course, learner: learner);
        var cert = CreateCertificate(51, enr.EnrollmentId, "CERT-2026-INST", enrollment: enr);

        // Act
        var result = await Service.GetCertificateByIdAsync(cert.CertificateId, currentUserId: instructorId);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateId.Should().Be(51);
    }

    [Fact]
    public async Task GetCertificateByIdAsync_WhenRequestedByAdminUser_ReturnsCertificateDto()
    {
        // Arrange
        var learnerId = 1;
        var instructorId = 10;
        var adminId = 999;
        var admin = CreateUser(adminId, "System Admin", "admin@example.com", "Admin");
        var course = CreateCourse(100, instructorId, "Advanced Speech");
        var enr = CreateEnrollment(1, learnerId, course.CourseId, course: course);
        var cert = CreateCertificate(52, enr.EnrollmentId, "CERT-2026-ADMIN", enrollment: enr);

        // Act
        var result = await Service.GetCertificateByIdAsync(cert.CertificateId, currentUserId: adminId);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateId.Should().Be(52);
    }

    [Fact]
    public async Task GetCertificateByIdAsync_WhenCertificateNotFound_ReturnsNull()
    {
        // Act
        var result = await Service.GetCertificateByIdAsync(9999, currentUserId: 1);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCertificateByIdAsync_WhenRequestedByUnauthorizedUser_ReturnsNull()
    {
        // Arrange
        var learnerId = 1;
        var instructorId = 10;
        var unauthorizedUserId = 55;
        CreateUser(unauthorizedUserId, "Unrelated User", "unrelated@example.com", "Learner");
        var course = CreateCourse(100, instructorId, "Advanced Speech");
        var enr = CreateEnrollment(1, learnerId, course.CourseId, course: course);
        var cert = CreateCertificate(53, enr.EnrollmentId, "CERT-2026-UNAUTH", enrollment: enr);

        // Act
        var result = await Service.GetCertificateByIdAsync(cert.CertificateId, currentUserId: unauthorizedUserId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCertificateByIdAsync_WhenCurrentUserIdIsNull_ReturnsCertificateDtoWithoutAccessCheck()
    {
        // Arrange
        var course = CreateCourse(100, 10, "Advanced Speech");
        var enr = CreateEnrollment(1, 1, course.CourseId, course: course);
        var cert = CreateCertificate(54, enr.EnrollmentId, "CERT-2026-PUBLIC", enrollment: enr);

        // Act
        var result = await Service.GetCertificateByIdAsync(cert.CertificateId, currentUserId: null);

        // Assert
        result.Should().NotBeNull();
        result!.CertificateCode.Should().Be("CERT-2026-PUBLIC");
    }
}
