using System;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Learning.CertificateServiceTests;

public class VerifyCertificateAsyncTests : CertificateServiceTestBase
{
    [Fact]
    public async Task VerifyCertificateAsync_WhenActiveCertificateCodeExists_ReturnsValidVerificationDto()
    {
        // Arrange
        var learner = CreateUser(1, "John Doe", "john@example.com");
        var course = CreateCourse(100, 10, "Voice Mastery");
        var enr = CreateEnrollment(1, learner.UserId, course.CourseId, course: course, learner: learner);
        var cert = CreateCertificate(10, enr.EnrollmentId, "CERT-2026-ACTIVE1", status: "ACTIVE", enrollment: enr);

        // Act
        var result = await Service.VerifyCertificateAsync("CERT-2026-ACTIVE1");

        // Assert
        result.Should().NotBeNull();
        result!.CertificateCode.Should().Be("CERT-2026-ACTIVE1");
        result.LearnerName.Should().Be("John Doe");
        result.CourseTitle.Should().Be("Voice Mastery");
        result.IsValid.Should().BeTrue();
        result.Status.Should().Be("ACTIVE");
    }

    [Fact]
    public async Task VerifyCertificateAsync_WhenCertificateCodeNotFound_ReturnsNotFoundVerificationDto()
    {
        // Act
        var result = await Service.VerifyCertificateAsync("CERT-9999-NOTFOUND");

        // Assert
        result.Should().NotBeNull();
        result!.CertificateCode.Should().Be("CERT-9999-NOTFOUND");
        result.LearnerName.Should().Be("N/A");
        result.CourseTitle.Should().Be("N/A");
        result.IsValid.Should().BeFalse();
        result.Status.Should().Be("NOT_FOUND");
        result.IssuedAt.Should().Be(DateTime.MinValue);
    }

    [Fact]
    public async Task VerifyCertificateAsync_WhenCertificateStatusIsRevoked_ReturnsInvalidVerificationDto()
    {
        // Arrange
        var learner = CreateUser(1, "Revoked User", "revoked@example.com");
        var course = CreateCourse(100, 10, "Voice Mastery");
        var enr = CreateEnrollment(1, learner.UserId, course.CourseId, course: course, learner: learner);
        CreateCertificate(11, enr.EnrollmentId, "CERT-2026-REVOKED", status: "REVOKED", enrollment: enr);

        // Act
        var result = await Service.VerifyCertificateAsync("CERT-2026-REVOKED");

        // Assert
        result.Should().NotBeNull();
        result!.IsValid.Should().BeFalse();
        result.Status.Should().Be("REVOKED");
    }

    [Fact]
    public async Task VerifyCertificateAsync_WhenCodeIsNull_ReturnsNull()
    {
        // Act
        var result = await Service.VerifyCertificateAsync(null!);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task VerifyCertificateAsync_WhenCodeIsWhitespaceOrEmpty_ReturnsNull()
    {
        // Act
        var emptyResult = await Service.VerifyCertificateAsync("");
        var whitespaceResult = await Service.VerifyCertificateAsync("    ");

        // Assert
        emptyResult.Should().BeNull();
        whitespaceResult.Should().BeNull();
    }

    [Fact]
    public async Task VerifyCertificateAsync_WhenCodeHasLeadingTrailingSpacesAndMixedCase_NormalizesAndVerifies()
    {
        // Arrange
        var learner = CreateUser(1, "Jane Doe", "jane@example.com");
        var course = CreateCourse(100, 10, "Voice Mastery");
        var enr = CreateEnrollment(1, learner.UserId, course.CourseId, course: course, learner: learner);
        CreateCertificate(12, enr.EnrollmentId, "CERT-2026-MIXEDCASE", status: "ACTIVE", enrollment: enr);

        // Act
        var result = await Service.VerifyCertificateAsync("  cert-2026-mixedcase  ");

        // Assert
        result.Should().NotBeNull();
        result!.CertificateCode.Should().Be("CERT-2026-MIXEDCASE");
        result.IsValid.Should().BeTrue();
    }
}
