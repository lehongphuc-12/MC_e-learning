using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningAccessServiceTests;

public class CheckCertificateAsyncTests : LearningAccessServiceTestBase
{
    [Fact]
    public async Task CheckCertificateAsync_WhenAllLessonsCompletedAndFinalExamPassed_ReturnsAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var mod = CreateModule(1, course.CourseId, "Module 1");
        var lesson = CreateLesson(1, course.CourseId, moduleId: mod.ModuleId);
        CreateLessonVideoMaterial(10, course.CourseId, lesson.LessonId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: true);

        var chapterQuiz = CreateQuiz(20, course.CourseId, lessonId: null, moduleId: mod.ModuleId, purpose: QuizPurpose.CHAPTER_ASSESSMENT);
        CreateQuizAttempt(1, chapterQuiz.QuizId, learnerId, QuizAttemptStatus.PASSED);

        var finalQuiz = CreateQuiz(30, course.CourseId, lessonId: null, moduleId: null, purpose: QuizPurpose.FINAL_ASSESSMENT);
        CreateQuizAttempt(2, finalQuiz.QuizId, learnerId, QuizAttemptStatus.PASSED);

        // Act
        var (allowed, reason) = await Service.CheckCertificateAsync(learnerId, course.CourseId);

        // Assert
        allowed.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public async Task CheckCertificateAsync_WhenFinalExamNotPassed_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var mod = CreateModule(1, course.CourseId, "Module 1");
        var lesson = CreateLesson(1, course.CourseId, moduleId: mod.ModuleId);
        CreateLessonVideoMaterial(10, course.CourseId, lesson.LessonId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: true);

        var chapterQuiz = CreateQuiz(20, course.CourseId, lessonId: null, moduleId: mod.ModuleId, purpose: QuizPurpose.CHAPTER_ASSESSMENT);
        CreateQuizAttempt(1, chapterQuiz.QuizId, learnerId, QuizAttemptStatus.PASSED);

        var finalQuiz = CreateQuiz(30, course.CourseId, lessonId: null, moduleId: null, purpose: QuizPurpose.FINAL_ASSESSMENT);
        // Final exam not passed

        // Act
        var (allowed, reason) = await Service.CheckCertificateAsync(learnerId, course.CourseId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Vui lòng đạt bài thi cuối khóa trước.");
    }

    [Fact]
    public async Task CheckCertificateAsync_WhenChapterAssessmentNotPassed_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var mod = CreateModule(1, course.CourseId, "Module 1");
        var lesson = CreateLesson(1, course.CourseId, moduleId: mod.ModuleId);
        CreateLessonVideoMaterial(10, course.CourseId, lesson.LessonId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: true);

        var chapterQuiz = CreateQuiz(20, course.CourseId, lessonId: null, moduleId: mod.ModuleId, purpose: QuizPurpose.CHAPTER_ASSESSMENT);
        // Chapter quiz NOT passed

        // Act
        var (allowed, reason) = await Service.CheckCertificateAsync(learnerId, course.CourseId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Vui lòng đạt tất cả bài đánh giá chương trước khi thi cuối khóa.");
    }

    [Fact]
    public async Task CheckCertificateAsync_WhenLessonProgressIncomplete_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);
        CreateLessonVideoMaterial(10, course.CourseId, lesson.LessonId);
        // Lesson video progress NOT completed

        // Act
        var (allowed, reason) = await Service.CheckCertificateAsync(learnerId, course.CourseId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Vui lòng hoàn thành toàn bộ video và PASS các bài tập được gắn trước khi thi cuối khóa.");
    }

    [Fact]
    public async Task CheckCertificateAsync_WhenCourseHasNoActiveLessons_ReturnsNotAllowed()
    {
        // Arrange
        var course = CreateCourse(100);

        // Act
        var (allowed, reason) = await Service.CheckCertificateAsync(1, course.CourseId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Khóa học chưa có bài học đang hoạt động.");
    }

    [Fact]
    public async Task CheckCertificateAsync_WhenLearnerNotEnrolled_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        // No enrollment record

        // Act
        var (allowed, reason) = await Service.CheckCertificateAsync(learnerId, course.CourseId);

        // Assert
        allowed.Should().BeFalse();
    }
}
