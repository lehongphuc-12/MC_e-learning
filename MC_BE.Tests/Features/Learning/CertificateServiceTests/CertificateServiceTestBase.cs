using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Learning.Services;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;
using Moq;

namespace MC_BE.Tests.Features.Learning.CertificateServiceTests;

public abstract class CertificateServiceTestBase
{
    protected readonly Mock<IGenericRepository<Certificate>> CertificateRepoMock = new();
    protected readonly Mock<IGenericRepository<Enrollment>> EnrollmentRepoMock = new();
    protected readonly Mock<IGenericRepository<Lesson>> LessonRepoMock = new();
    protected readonly Mock<IGenericRepository<LessonProgress>> ProgressRepoMock = new();
    protected readonly Mock<IGenericRepository<User>> UserRepoMock = new();
    protected readonly Mock<IUnitOfWork> UnitOfWorkMock = new();
    protected readonly Mock<ICourseGiftAccessService> CourseGiftAccessMock = new();
    protected readonly Mock<ICourseLearningAccessService> CourseAccessMock = new();
    protected readonly Mock<ILearningAccessService> AccessMock = new();

    protected readonly List<Certificate> Certificates = new();
    protected readonly List<Enrollment> Enrollments = new();
    protected readonly List<Lesson> Lessons = new();
    protected readonly List<LessonProgress> LessonProgresses = new();
    protected readonly List<User> Users = new();

    protected readonly CertificateService Service;

    protected CertificateServiceTestBase()
    {
        // Certificate repository setup
        CertificateRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Certificate, bool>>>(), It.IsAny<Expression<Func<Certificate, object>>[]>()))
            .ReturnsAsync((Expression<Func<Certificate, bool>> pred, Expression<Func<Certificate, object>>[] includes) =>
            {
                foreach (var c in Certificates)
                {
                    if (c.Enrollment == null)
                    {
                        c.Enrollment = Enrollments.FirstOrDefault(e => e.EnrollmentId == c.EnrollmentId)!;
                    }
                }
                return Certificates.Where(pred.Compile()).ToList();
            });

        CertificateRepoMock
            .Setup(r => r.AddAsync(It.IsAny<Certificate>()))
            .Callback<Certificate>(c =>
            {
                if (c.CertificateId == 0) c.CertificateId = Certificates.Count + 1;
                Certificates.Add(c);
            })
            .Returns(Task.CompletedTask);

        // Enrollment repository setup
        EnrollmentRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Enrollment, bool>>>(), It.IsAny<Expression<Func<Enrollment, object>>[]>()))
            .ReturnsAsync((Expression<Func<Enrollment, bool>> pred, Expression<Func<Enrollment, object>>[] includes) =>
                Enrollments.Where(pred.Compile()).ToList());

        // Lesson repository setup
        LessonRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<Lesson, bool>>>(), It.IsAny<Expression<Func<Lesson, object>>[]>()))
            .ReturnsAsync((Expression<Func<Lesson, bool>> pred, Expression<Func<Lesson, object>>[] includes) =>
                Lessons.Where(pred.Compile()).ToList());

        // LessonProgress repository setup
        ProgressRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<LessonProgress, bool>>>(), It.IsAny<Expression<Func<LessonProgress, object>>[]>()))
            .ReturnsAsync((Expression<Func<LessonProgress, bool>> pred, Expression<Func<LessonProgress, object>>[] includes) =>
                LessonProgresses.Where(pred.Compile()).ToList());

        // User repository setup
        UserRepoMock
            .Setup(r => r.FindAsync(It.IsAny<Expression<Func<User, bool>>>(), It.IsAny<Expression<Func<User, object>>[]>()))
            .ReturnsAsync((Expression<Func<User, bool>> pred, Expression<Func<User, object>>[] includes) =>
                Users.Where(pred.Compile()).ToList());

        // Unit of Work setup
        UnitOfWorkMock.Setup(u => u.SaveChangesAsync()).ReturnsAsync(1);

        // Access services default behaviors
        CourseAccessMock
            .Setup(c => c.CanAccessCourseAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<bool>()))
            .ReturnsAsync(true);

        AccessMock
            .Setup(a => a.CheckCertificateAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync((true, null));

        CourseGiftAccessMock
            .Setup(g => g.RevokeGiftGrantsForCompletedEnrollmentAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        Service = new CertificateService(
            CertificateRepoMock.Object,
            EnrollmentRepoMock.Object,
            LessonRepoMock.Object,
            ProgressRepoMock.Object,
            UserRepoMock.Object,
            UnitOfWorkMock.Object,
            CourseGiftAccessMock.Object,
            CourseAccessMock.Object,
            AccessMock.Object
        );
    }

    protected User CreateUser(int userId, string fullName, string email, string roleName = "Learner")
    {
        var role = new Role { RoleId = roleName == "Admin" ? 3 : (roleName == "Instructor" ? 2 : 1), RoleName = roleName };
        var user = new User
        {
            UserId = userId,
            FullName = fullName,
            Email = email,
            RoleId = role.RoleId,
            Role = role,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow
        };
        Users.Add(user);
        return user;
    }

    protected Course CreateCourse(int courseId, int instructorId, string title = "Sample Course")
    {
        var instructor = Users.FirstOrDefault(u => u.UserId == instructorId) ?? CreateUser(instructorId, "Instructor User", $"inst{instructorId}@example.com", "Instructor");
        return new Course
        {
            CourseId = courseId,
            InstructorId = instructorId,
            Instructor = instructor,
            Title = title,
            Slug = $"sample-course-{courseId}",
            CreatedAt = DateTime.UtcNow
        };
    }

    protected Enrollment CreateEnrollment(
        int enrollmentId,
        int learnerId,
        int courseId,
        string status = "ACTIVE",
        decimal completionPercentage = 100.00m,
        Course? course = null,
        User? learner = null)
    {
        var user = learner ?? Users.FirstOrDefault(u => u.UserId == learnerId) ?? CreateUser(learnerId, "Learner User", $"learner{learnerId}@example.com");
        var crs = course ?? CreateCourse(courseId, 10);

        var enrollment = new Enrollment
        {
            EnrollmentId = enrollmentId,
            LearnerId = learnerId,
            CourseId = courseId,
            Status = status,
            CompletionPercentage = completionPercentage,
            Learner = user,
            Course = crs,
            CreatedAt = DateTime.UtcNow
        };
        Enrollments.Add(enrollment);
        return enrollment;
    }

    protected Certificate CreateCertificate(
        int certificateId,
        int enrollmentId,
        string certificateCode,
        string status = "ACTIVE",
        DateTime? issuedAt = null,
        Enrollment? enrollment = null)
    {
        var enr = enrollment ?? Enrollments.FirstOrDefault(e => e.EnrollmentId == enrollmentId);
        var cert = new Certificate
        {
            CertificateId = certificateId,
            EnrollmentId = enrollmentId,
            CertificateCode = certificateCode,
            Status = status,
            IssuedAt = issuedAt ?? DateTime.UtcNow,
            CompletionPercentage = 100.00m,
            Grade = "EXCELLENT",
            Enrollment = enr!
        };
        Certificates.Add(cert);
        return cert;
    }

    protected Lesson CreateLesson(
        int lessonId,
        int courseId,
        string title = "Lesson",
        LessonStatus status = LessonStatus.ACTIVE)
    {
        var lesson = new Lesson
        {
            LessonId = lessonId,
            CourseId = courseId,
            Title = title,
            Status = status,
            CreatedAt = DateTime.UtcNow
        };
        Lessons.Add(lesson);
        return lesson;
    }

    protected LessonProgress CreateLessonProgress(
        int progressId,
        int enrollmentId,
        int lessonId,
        bool isCompleted = true,
        LessonProgressStatus status = LessonProgressStatus.COMPLETED)
    {
        var progress = new LessonProgress
        {
            LessonProgressId = progressId,
            EnrollmentId = enrollmentId,
            LessonId = lessonId,
            IsCompleted = isCompleted,
            Status = status,
            UpdatedAt = DateTime.UtcNow
        };
        LessonProgresses.Add(progress);
        return progress;
    }
}
