using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Services;

public class CertificateService : ICertificateService
{
    private readonly SmartMcDbContext _context;

    public CertificateService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<List<CertificateDto>> GetMyCertificatesAsync(int learnerId)
    {
        var certificates = await _context.Certificates
            .Include(c => c.Enrollment)
                .ThenInclude(e => e.Course)
                    .ThenInclude(co => co.Instructor)
            .Include(c => c.Enrollment)
                .ThenInclude(e => e.Learner)
            .Where(c => c.Enrollment.LearnerId == learnerId && c.Status == "ACTIVE")
            .OrderByDescending(c => c.IssuedAt)
            .ToListAsync();

        return certificates.Select(MapToDto).ToList();
    }

    public async Task<CertificateDto?> GetCertificateByCourseAsync(int learnerId, int courseId)
    {
        var certificate = await _context.Certificates
            .Include(c => c.Enrollment)
                .ThenInclude(e => e.Course)
                    .ThenInclude(co => co.Instructor)
            .Include(c => c.Enrollment)
                .ThenInclude(e => e.Learner)
            .FirstOrDefaultAsync(c => c.Enrollment.LearnerId == learnerId &&
                                      c.Enrollment.CourseId == courseId &&
                                      c.Status == "ACTIVE");

        return certificate != null ? MapToDto(certificate) : null;
    }

    public async Task<CertificateDto?> GetCertificateByIdAsync(int certificateId, int? currentUserId = null)
    {
        var certificate = await _context.Certificates
            .Include(c => c.Enrollment)
                .ThenInclude(e => e.Course)
                    .ThenInclude(co => co.Instructor)
            .Include(c => c.Enrollment)
                .ThenInclude(e => e.Learner)
            .FirstOrDefaultAsync(c => c.CertificateId == certificateId);

        if (certificate == null) return null;

        // If currentUserId is passed, ensure learner owns certificate or is instructor/admin
        if (currentUserId.HasValue && certificate.Enrollment.LearnerId != currentUserId.Value)
        {
            // Allow if user is instructor of the course
            if (certificate.Enrollment.Course?.InstructorId != currentUserId.Value)
            {
                // Check if user is admin
                var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == currentUserId.Value);
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
        var enrollment = await _context.Enrollments
            .Include(e => e.Course)
                .ThenInclude(c => c.Instructor)
            .Include(e => e.Learner)
            .FirstOrDefaultAsync(e => e.LearnerId == learnerId && e.CourseId == courseId);

        if (enrollment == null)
        {
            throw new ArgumentException("Learner is not enrolled in this course.");
        }

        // Idempotency: Return existing certificate if already issued
        var existingCert = await _context.Certificates
            .FirstOrDefaultAsync(c => c.EnrollmentId == enrollment.EnrollmentId);

        if (existingCert != null)
        {
            return MapToDto(existingCert);
        }

        // Verify completion rate
        var totalLessons = await _context.Lessons
            .CountAsync(l => l.CourseId == courseId && l.Status == Core.Enums.LessonStatus.ACTIVE);

        var completedLessons = await _context.LessonProgresses
            .CountAsync(lp => lp.EnrollmentId == enrollment.EnrollmentId &&
                         (lp.IsCompleted || lp.Status == Core.Enums.LessonProgressStatus.COMPLETED));

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

        _context.Certificates.Add(certificate);
        await _context.SaveChangesAsync();

        return MapToDto(certificate);
    }

    public async Task<CertificateVerificationDto?> VerifyCertificateAsync(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        var cleanCode = code.Trim().ToUpperInvariant();

        var cert = await _context.Certificates
            .Include(c => c.Enrollment)
                .ThenInclude(e => e.Course)
            .Include(c => c.Enrollment)
                .ThenInclude(e => e.Learner)
            .FirstOrDefaultAsync(c => c.CertificateCode.ToUpper() == cleanCode);

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
