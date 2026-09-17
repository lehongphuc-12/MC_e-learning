using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Services;

public class LearningProgressService : ILearningProgressService
{
    private readonly SmartMcDbContext _context;
    private readonly ICertificateService _certificateService;

    public LearningProgressService(SmartMcDbContext context, ICertificateService certificateService)
    {
        _context = context;
        _certificateService = certificateService;
    }

    public async Task<CourseLearningProgressDto?> GetCourseProgressAsync(int learnerId, int courseId)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.Course)
            .Include(e => e.LessonProgresses)
            .FirstOrDefaultAsync(e => e.LearnerId == learnerId && e.CourseId == courseId);

        if (enrollment == null)
        {
            return null;
        }

        var lessons = await _context.Lessons
            .Where(l => l.CourseId == courseId && l.Status == LessonStatus.ACTIVE)
            .OrderBy(l => l.OrderIndex)
            .ToListAsync();

        var totalLessons = lessons.Count;
        var lessonProgressDict = enrollment.LessonProgresses.ToDictionary(lp => lp.LessonId);

        var progressDtos = new List<LessonProgressDto>();
        int completedCount = 0;

        foreach (var lesson in lessons)
        {
            if (lessonProgressDict.TryGetValue(lesson.LessonId, out var progress))
            {
                bool isDone = progress.IsCompleted || progress.Status == LessonProgressStatus.COMPLETED;
                if (isDone) completedCount++;

                progressDtos.Add(new LessonProgressDto
                {
                    LessonId = lesson.LessonId,
                    IsCompleted = isDone,
                    LastPositionSeconds = progress.LastPositionSeconds,
                    TimeSpentSeconds = progress.TimeSpentSeconds,
                    TimeSpentMinutes = progress.TimeSpentMinutes,
                    LastAccessedAt = progress.LastAccessedAt,
                    CompletedAt = progress.CompletedAt
                });
            }
            else
            {
                progressDtos.Add(new LessonProgressDto
                {
                    LessonId = lesson.LessonId,
                    IsCompleted = false,
                    LastPositionSeconds = 0,
                    TimeSpentSeconds = 0,
                    TimeSpentMinutes = 0,
                    LastAccessedAt = null,
                    CompletedAt = null
                });
            }
        }

        decimal completionPercentage = totalLessons > 0
            ? Math.Round((decimal)completedCount / totalLessons * 100, 2)
            : 0m;

        // Check if certificate exists
        var certificate = await _context.Certificates
            .FirstOrDefaultAsync(c => c.EnrollmentId == enrollment.EnrollmentId);

        return new CourseLearningProgressDto
        {
            CourseId = courseId,
            CourseTitle = enrollment.Course?.Title ?? string.Empty,
            EnrollmentId = enrollment.EnrollmentId,
            CompletionPercentage = completionPercentage,
            IsCompleted = completionPercentage >= 100.00m,
            CompletedLessonsCount = completedCount,
            TotalLessonsCount = totalLessons,
            CertificateId = certificate?.CertificateId,
            CertificateCode = certificate?.CertificateCode,
            LessonProgresses = progressDtos
        };
    }

    public async Task<CourseLearningProgressDto?> UpdateLessonProgressAsync(
        int learnerId, int lessonId, UpdateLessonProgressRequest request)
    {
        var lesson = await _context.Lessons.FirstOrDefaultAsync(l => l.LessonId == lessonId);
        if (lesson == null) return null;

        var enrollment = await _context.Enrollments
            .Include(e => e.LessonProgresses)
            .FirstOrDefaultAsync(e => e.LearnerId == learnerId && e.CourseId == lesson.CourseId);

        if (enrollment == null) return null;

        var progress = enrollment.LessonProgresses.FirstOrDefault(lp => lp.LessonId == lessonId);
        if (progress == null)
        {
            progress = new LessonProgress
            {
                EnrollmentId = enrollment.EnrollmentId,
                LessonId = lessonId,
                Status = LessonProgressStatus.NOT_STARTED,
                IsCompleted = false,
                LastPositionSeconds = 0,
                TimeSpentSeconds = 0,
                TimeSpentMinutes = 0,
                LastAccessedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.LessonProgresses.Add(progress);
        }

        if (request.IsCompleted.HasValue)
        {
            progress.IsCompleted = request.IsCompleted.Value;
            if (request.IsCompleted.Value)
            {
                progress.Status = LessonProgressStatus.COMPLETED;
                progress.CompletedAt ??= DateTime.UtcNow;
            }
            else
            {
                progress.Status = LessonProgressStatus.IN_PROGRESS;
                progress.CompletedAt = null;
            }
        }

        if (request.LastPositionSeconds.HasValue)
        {
            progress.LastPositionSeconds = Math.Max(0, request.LastPositionSeconds.Value);
        }

        if (request.TimeSpentSeconds.HasValue)
        {
            progress.TimeSpentSeconds = Math.Max(progress.TimeSpentSeconds, request.TimeSpentSeconds.Value);
            progress.TimeSpentMinutes = progress.TimeSpentSeconds / 60;
        }

        progress.LastAccessedAt = DateTime.UtcNow;
        progress.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Calculate new course completion rate
        var allLessons = await _context.Lessons
            .Where(l => l.CourseId == lesson.CourseId && l.Status == LessonStatus.ACTIVE)
            .Select(l => l.LessonId)
            .ToListAsync();

        var completedCount = await _context.LessonProgresses
            .Where(lp => lp.EnrollmentId == enrollment.EnrollmentId &&
                         allLessons.Contains(lp.LessonId) &&
                         (lp.IsCompleted || lp.Status == LessonProgressStatus.COMPLETED))
            .CountAsync();

        int totalLessons = allLessons.Count;
        decimal newPercentage = totalLessons > 0
            ? Math.Round((decimal)completedCount / totalLessons * 100, 2)
            : 0m;

        enrollment.CompletionPercentage = newPercentage;
        enrollment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Auto-issue certificate if 100% completed
        if (newPercentage >= 100.00m)
        {
            try
            {
                await _certificateService.IssueCertificateAsync(learnerId, lesson.CourseId);
            }
            catch (Exception)
            {
                // Suppress if already issued or concurrent
            }
        }

        return await GetCourseProgressAsync(learnerId, lesson.CourseId);
    }
}
