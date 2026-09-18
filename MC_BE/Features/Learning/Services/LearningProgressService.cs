using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Services;

public class LearningProgressService : ILearningProgressService
{
    private readonly IGenericRepository<Enrollment> _enrollmentRepository;
    private readonly IGenericRepository<Lesson> _lessonRepository;
    private readonly IGenericRepository<LessonProgress> _progressRepository;
    private readonly IGenericRepository<Certificate> _certificateRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICertificateService _certificateService;

    public LearningProgressService(
        IGenericRepository<Enrollment> enrollmentRepository,
        IGenericRepository<Lesson> lessonRepository,
        IGenericRepository<LessonProgress> progressRepository,
        IGenericRepository<Certificate> certificateRepository,
        IUnitOfWork unitOfWork,
        ICertificateService certificateService)
    {
        _enrollmentRepository = enrollmentRepository;
        _lessonRepository = lessonRepository;
        _progressRepository = progressRepository;
        _certificateRepository = certificateRepository;
        _unitOfWork = unitOfWork;
        _certificateService = certificateService;
    }

    public async Task<CourseLearningProgressDto?> GetCourseProgressAsync(int learnerId, int courseId)
    {
        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId && e.CourseId == courseId,
            e => e.Course,
            e => e.LessonProgresses);

        var enrollment = enrollments.FirstOrDefault();

        if (enrollment == null)
        {
            return null;
        }

        var lessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == courseId && l.Status == LessonStatus.ACTIVE);

        var lessons = lessonsList
            .OrderBy(l => l.OrderIndex)
            .ToList();

        var totalLessons = lessons.Count;
        var lessonProgressDict = (enrollment.LessonProgresses ?? new List<LessonProgress>())
            .ToDictionary(lp => lp.LessonId);

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
        var certs = await _certificateRepository.FindAsync(
            c => c.EnrollmentId == enrollment.EnrollmentId);

        var certificate = certs.FirstOrDefault();

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
        var lesson = await _lessonRepository.GetByIdAsync(lessonId);
        if (lesson == null) return null;

        var enrollments = await _enrollmentRepository.FindAsync(
            e => e.LearnerId == learnerId && e.CourseId == lesson.CourseId,
            e => e.LessonProgresses);

        var enrollment = enrollments.FirstOrDefault();

        if (enrollment == null) return null;

        var progress = (enrollment.LessonProgresses ?? new List<LessonProgress>()).FirstOrDefault(lp => lp.LessonId == lessonId);
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
            await _progressRepository.AddAsync(progress);
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

        _progressRepository.Update(progress);
        await _unitOfWork.SaveChangesAsync();

        // Calculate new course completion rate
        var allLessonsList = await _lessonRepository.FindAsync(
            l => l.CourseId == lesson.CourseId && l.Status == LessonStatus.ACTIVE);

        var allLessonIds = allLessonsList.Select(l => l.LessonId).ToList();

        var completedProgresses = await _progressRepository.FindAsync(
            lp => lp.EnrollmentId == enrollment.EnrollmentId &&
                 allLessonIds.Contains(lp.LessonId) &&
                 (lp.IsCompleted || lp.Status == LessonProgressStatus.COMPLETED));

        int completedCount = completedProgresses.Count();
        int totalLessons = allLessonIds.Count;

        decimal newPercentage = totalLessons > 0
            ? Math.Round((decimal)completedCount / totalLessons * 100, 2)
            : 0m;

        enrollment.CompletionPercentage = newPercentage;
        enrollment.UpdatedAt = DateTime.UtcNow;

        _enrollmentRepository.Update(enrollment);
        await _unitOfWork.SaveChangesAsync();

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

