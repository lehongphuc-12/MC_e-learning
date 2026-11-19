using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningAccessServiceTests;

public class CheckQuizAsyncTests : LearningAccessServiceTestBase
{
    [Fact]
    public async Task CheckQuizAsync_WhenPracticeQuizAndLessonVideoCompleted_ReturnsAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);
        CreateLessonVideoMaterial(10, course.CourseId, lesson.LessonId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: true);

        var quiz = CreateQuiz(10, course.CourseId, lesson.LessonId, moduleId: null, purpose: QuizPurpose.PRACTICE);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(learnerId, quiz.QuizId);

        // Assert
        allowed.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public async Task CheckQuizAsync_WhenChapterAssessmentAndAllModuleLessonsCompleted_ReturnsAllowed()
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

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(learnerId, chapterQuiz.QuizId);

        // Assert
        allowed.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public async Task CheckQuizAsync_WhenFinalAssessmentAndAllGatesPassed_ReturnsAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var mod = CreateModule(1, course.CourseId, "Module 1");
        var lesson = CreateLesson(1, course.CourseId, moduleId: mod.ModuleId);
        CreateLessonVideoMaterial(10, course.CourseId, lesson.LessonId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: true);

        // Pass chapter assessment
        var chapterQuiz = CreateQuiz(20, course.CourseId, lessonId: null, moduleId: mod.ModuleId, purpose: QuizPurpose.CHAPTER_ASSESSMENT);
        CreateQuizAttempt(1, chapterQuiz.QuizId, learnerId, QuizAttemptStatus.PASSED);

        var finalQuiz = CreateQuiz(30, course.CourseId, lessonId: null, moduleId: null, purpose: QuizPurpose.FINAL_ASSESSMENT);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(learnerId, finalQuiz.QuizId);

        // Assert
        allowed.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public async Task CheckQuizAsync_WhenQuizNotFoundOrInactive_ReturnsNotAllowed()
    {
        // Arrange
        var inactiveQuiz = CreateQuiz(99, courseId: 100, lessonId: null, moduleId: null, purpose: QuizPurpose.PRACTICE, status: QuizStatus.DRAFT);

        // Act
        var (allowedNotFound, reasonNotFound) = await Service.CheckQuizAsync(1, 9999);
        var (allowedInactive, reasonInactive) = await Service.CheckQuizAsync(1, inactiveQuiz.QuizId);

        // Assert
        allowedNotFound.Should().BeFalse();
        reasonNotFound.Should().Be("Bài kiểm tra hiện không khả dụng.");

        allowedInactive.Should().BeFalse();
        reasonInactive.Should().Be("Bài kiểm tra hiện không khả dụng.");
    }

    [Fact]
    public async Task CheckQuizAsync_WhenOutsideAvailableWindow_ReturnsNotAllowed()
    {
        // Arrange
        var future = DateTime.UtcNow.AddDays(2);
        var quiz = CreateQuiz(10, courseId: 100, lessonId: null, moduleId: null, purpose: QuizPurpose.PRACTICE, availableFrom: future);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(1, quiz.QuizId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Bài kiểm tra nằm ngoài thời gian được phép làm.");
    }

    [Fact]
    public async Task CheckQuizAsync_WhenQuizNotAssociatedWithAnyCourse_ReturnsNotAllowed()
    {
        // Arrange
        var orphanedQuiz = CreateQuiz(10, courseId: null, lessonId: null, moduleId: null, purpose: QuizPurpose.PRACTICE);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(1, orphanedQuiz.QuizId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Bài kiểm tra chưa được gắn với khóa học.");
    }

    [Fact]
    public async Task CheckQuizAsync_WhenLearnerNotEnrolled_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var quiz = CreateQuiz(10, course.CourseId, lessonId: null, moduleId: null, purpose: QuizPurpose.PRACTICE);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(learnerId, quiz.QuizId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Bạn cần đăng ký khóa học để tiếp tục.");
    }

    [Fact]
    public async Task CheckQuizAsync_WhenPracticeQuizVideoIncomplete_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);
        CreateLessonVideoMaterial(10, course.CourseId, lesson.LessonId);
        // Video progress NOT created

        var quiz = CreateQuiz(10, course.CourseId, lesson.LessonId, moduleId: null, purpose: QuizPurpose.PRACTICE);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(learnerId, quiz.QuizId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Vui lòng hoàn thành video của bài học trước khi làm bài tập.");
    }

    [Fact]
    public async Task CheckQuizAsync_WhenPracticeQuizHasNoLessonId_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var quiz = CreateQuiz(10, course.CourseId, lessonId: null, moduleId: null, purpose: QuizPurpose.PRACTICE);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(learnerId, quiz.QuizId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Bài tập luyện tập phải được gắn với một bài học.");
    }

    [Fact]
    public async Task CheckQuizAsync_WhenChapterAssessmentHasNoModuleId_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var quiz = CreateQuiz(10, course.CourseId, lessonId: null, moduleId: null, purpose: QuizPurpose.CHAPTER_ASSESSMENT);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(learnerId, quiz.QuizId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Bài đánh giá chương chưa được gắn với chương học.");
    }

    [Fact]
    public async Task CheckQuizAsync_WhenChapterAssessmentModuleHasNoLessons_ReturnsNotAllowed()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var mod = CreateModule(1, course.CourseId, "Empty Module");
        var quiz = CreateQuiz(10, course.CourseId, lessonId: null, moduleId: mod.ModuleId, purpose: QuizPurpose.CHAPTER_ASSESSMENT);

        // Act
        var (allowed, reason) = await Service.CheckQuizAsync(learnerId, quiz.QuizId);

        // Assert
        allowed.Should().BeFalse();
        reason.Should().Be("Chương này chưa có bài học.");
    }
}
