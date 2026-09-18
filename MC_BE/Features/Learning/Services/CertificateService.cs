using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Services;

public class CertificateService : ICertificateService
{
    private readonly IGenericRepository<Certificate> _certificateRepository;
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<LessonProgress> _progressRepository;
    private readonly IGenericRepository<User> _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CertificateService(
        IGenericRepository<Certificate> certificateRepository,
        IGenericRepository<Enrollment> enrollmentRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<LessonProgress> progressRepository,
        IGenericRepository<User> userRepository,
        IUnitOfWork unitOfWork)
    {
        _certificateRepository = certificateRepository;
        _enrollmentRepository = enrollmentRepository;
        _lessonRepository = lessonRepository;
        _progressRepository = progressRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<CertificateDto>> GetMyCertificatesAsync(int learnerId)
    {
        var certs = await _certificateRepository.FindAsync(
            c => c.Enrollment.LearnerId == learnerId && c.Status == "ACTIVE",
            c => c.Enrollment);

        // Load navigation properties for Mapping
        var certList = certs.ToList();
        var enrollmentIds = certList.Select(c => c.EnrollmentId).Distinct().ToList();
        var enrollments = await _enrollmentRepository.FindAsync(
            e => enrollmentIds.Contains(e.EnrollmentId),
            e => e.Course,
            e => e.Learner);

        var enrollmentDict = enrollments.ToDictionary(e => e.EnrollmentId);

        foreach (var cert in certList)
        {
            if (enrollmentDict.TryGetValue(cert.EnrollmentId, out var enr))
            {
                cert.Enrollment = enr;
            }
        }

        return certList
            .OrderByDescending(c => c.IssuedAt)
            .Select(MapToDto)
            .ToList();
    }

    public async Task<CertificateDto?> GetCertificateByCourseAsync(int learnerId, int courseId)
    {
        var certs = await _certificateRepository.FindAsync(
            c => c.Enrollment.LearnerId == learnerId &&
                 c.Enrollment.CourseId == courseId &&
                 c.Status == "ACTIVE",
            c => c.Enrollment);

        var cert = certs.FirstOrDefault();
        if (cert == null) return null;

        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.EnrollmentId == cert.EnrollmentId,
            e => e.Course,
            e => e.Learner);

        cert.Enrollment = enrollments.FirstOrDefault() ?? cert.Enrollment;

        return MapToDto(cert);
    }

    public async Task<CertificateDto?> GetCertificateByIdAsync(int certificateId, int? currentUserId = null)
    {
        var certs = await _certificateRepository.FindAsync(
            c => c.CertificateId == certificateId,
            c => c.Enrollment);

        var certificate = certs.FirstOrDefault();
        if (certificate == null) return null;

        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.EnrollmentId == certificate.EnrollmentId,
            e => e.Course,
            e => e.Learner);

        certificate.Enrollment = enrollments.FirstOrDefault() ?? certificate.Enrollment;

        // If currentUserId is passed, ensure learner owns certificate or is instructor/admin
        if (currentUserId.HasValue && certificate.Enrollment?.LearnerId != currentUserId.Value)
        {
            // Allow if user is instructor of the course
            if (certificate.Enrollment?.Course?.InstructorId != currentUserId.Value)
            {
                // Check if user is admin
                var users = await _userRepository.FindAsync(u => u.UserId == currentUserId.Value, u => u.Role);
                var user = users.FirstOrDefault();
                if (user?.Role?.RoleName != "Admin")
                {
                    return null;
                }
            }
        }

        return MapToDto(certificate);
    }

    public async Task<CertificateDto?> IssueCertificateAsync(int learnerId, int courseId)
    {
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId && e.CourseId == courseId,
            e => e.Course,
            e => e.Learner);

        var enrollment = enrollments.FirstOrDefault();

        if (enrollment == null)
        {
            throw new ArgumentException("Learner is not enrolled in this course.");
        }

        // Idempotency: Return existing certificate if already issued
        var existingCerts = await _certificateRepository.FindAsync(
            c => c.EnrollmentId == enrollment.EnrollmentId);

        var existingCert = existingCerts.FirstOrDefault();

        if (existingCert != null)
        {
            existingCert.Enrollment = enrollment;
            return MapToDto(existingCert);
        }

        // Verify completion rate
        var totalLessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == courseId && l.Status == Core.Enums.LessonStatus.ACTIVE);
        var totalLessons = totalLessonsList.Count();

        var completedLessonsList = await _progressRepository.FindAsync(
            lp => lp.EnrollmentId == enrollment.EnrollmentId &&
                 (lp.IsCompleted || lp.Status == Core.Enums.LessonProgressStatus.COMPLETED));
        var completedLessons = completedLessonsList.Count();

        decimal completionPercentage = totalLessons > 0
            ? Math.Round((decimal)completedLessons / totalLessons * 100, 2)
            : 0m;

        if (totalLessons > 0 && completedLessons < totalLessons && enrollment.CompletionPercentage < 100.00m)
        {
            throw new InvalidOperationException($"Cannot issue certificate. Course completion is only {completionPercentage}%.");
        }

        // Generate unique certificate code: CERT-YYYY-XXXXXX
        string code = GenerateUniqueCertificateCode();

        var certificate = new Certificate
        {
            EnrollmentId = enrollment.EnrollmentId,
            CertificateCode = code,
            IssuedAt = DateTime.UtcNow,
            CompletionPercentage = 100.00m,
            Grade = "EXCELLENT",
            Status = "ACTIVE"
        };

        await _certificateRepository.AddAsync(certificate);
        await _unitOfWork.SaveChangesAsync();

        certificate.Enrollment = enrollment;
        return MapToDto(certificate);
    }

    public async Task<CertificateVerificationDto?> VerifyCertificateAsync(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        var cleanCode = code.Trim().ToUpperInvariant();

        var certs = await _certificateRepository.FindAsync(
            c => c.CertificateCode.ToUpper() == cleanCode,
            c => c.Enrollment);

        var cert = certs.FirstOrDefault();

        if (cert == null)
        {
            return new CertificateVerificationDto
            {
                CertificateCode = cleanCode,
                LearnerName = "N/A",
                CourseTitle = "N/A",
                IssuedAt = DateTime.MinValue,
                IsValid = false,
                Status = "NOT_FOUND"
            };
        }

        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.EnrollmentId == cert.EnrollmentId,
            e => e.Course,
            e => e.Learner);

        cert.Enrollment = enrollments.FirstOrDefault() ?? cert.Enrollment;

        return new CertificateVerificationDto
        {
            CertificateCode = cert.CertificateCode,
            LearnerName = cert.Enrollment?.Learner?.FullName ?? "Learner",
            CourseTitle = cert.Enrollment?.Course?.Title ?? "Course",
            IssuedAt = cert.IssuedAt,
            IsValid = cert.Status == "ACTIVE",
            Status = cert.Status
        };
    }

    private string GenerateUniqueCertificateCode()
    {
        var year = DateTime.UtcNow.Year;
        var randomPart = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
        return $"CERT-{year}-{randomPart}";
    }

    private static CertificateDto MapToDto(Certificate c)
    {
        return new CertificateDto
        {
            CertificateId = c.CertificateId,
            EnrollmentId = c.EnrollmentId,
            LearnerId = c.Enrollment?.LearnerId ?? 0,
            LearnerName = c.Enrollment?.Learner?.FullName ?? "Learner",
            CourseId = c.Enrollment?.CourseId ?? 0,
            CourseTitle = c.Enrollment?.Course?.Title ?? "Course",
            InstructorName = c.Enrollment?.Course?.Instructor?.FullName ?? "Instructor",
            CertificateCode = c.CertificateCode,
            IssuedAt = c.IssuedAt,
            CompletionPercentage = c.CompletionPercentage,
            Grade = c.Grade,
            Status = c.Status,
            CertificateUrl = c.CertificateUrl
        };
    }
}

