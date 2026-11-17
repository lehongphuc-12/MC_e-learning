using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningProgressServiceTests;

public class GetCourseProgressAsyncTests : LearningProgressServiceTestBase
{
    [Fact]
    public async Task GetCourseProgressAsync_WhenAllItemsCompletedAndCertAllowed_Returns100PercentAndIsCompletedTrue()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var mod = CreateModule(1, course.CourseId);

        // 1 active lesson (completed)
        var lesson = CreateLesson(1, course.CourseId, moduleId: mod.ModuleId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: true);

        // 1 active chapter quiz (passed)
        var chapterQuiz = CreateQuiz(10, course.CourseId, moduleId: mod.ModuleId, lessonId: null, purpose: QuizPurpose.CHAPTER_ASSESSMENT);
        CreateQuizAttempt(1, chapterQuiz.QuizId, learnerId, QuizAttemptStatus.PASSED);

        // 1 active final quiz (passed)
        var finalQuiz = CreateQuiz(20, course.CourseId, moduleId: null, lessonId: null, purpose: QuizPurpose.FINAL_ASSESSMENT);
        CreateQuizAttempt(2, finalQuiz.QuizId, learnerId, QuizAttemptStatus.PASSED);

        // 1 standalone speaking script (passed with score >= 80)
        var speakingScript = CreateSpeakingScript(30, course.CourseId);
        CreateSpeakingSubmission(1, learnerId, scriptId: speakingScript.ScriptId, score: 90m);

        AccessMock
            .Setup(a => a.CheckCertificateAsync(learnerId, course.CourseId))
            .ReturnsAsync((true, null));

        // Act
        var result = await Service.GetCourseProgressAsync(learnerId, course.CourseId);

        // Assert
        result.Should().NotBeNull();
        result!.CourseId.Should().Be(course.CourseId);
        result.CompletionPercentage.Should().Be(100.00m);
        result.IsCompleted.Should().BeTrue();
        result.CompletedLessonsCount.Should().Be(1);
        result.TotalLessonsCount.Should().Be(1);
        result.LessonProgresses.Should().HaveCount(1);
        result.LessonProgresses[0].IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task GetCourseProgressAsync_WhenPartialItemsCompleted_ReturnsCalculatedPercentage()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var mod = CreateModule(1, course.CourseId);

        // 2 active lessons: 1 completed, 1 not completed
        var lesson1 = CreateLesson(1, course.CourseId, moduleId: mod.ModuleId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, moduleId: mod.ModuleId, orderIndex: 2);
        CreateLessonProgress(1, enr.EnrollmentId, lesson1.LessonId, isCompleted: true);

        // 1 chapter quiz (passed)
        var chapterQuiz = CreateQuiz(10, course.CourseId, moduleId: mod.ModuleId, lessonId: null, purpose: QuizPurpose.CHAPTER_ASSESSMENT);
        CreateQuizAttempt(1, chapterQuiz.QuizId, learnerId, QuizAttemptStatus.PASSED);

        // 1 final quiz (not passed)
        var finalQuiz = CreateQuiz(20, course.CourseId, moduleId: null, lessonId: null, purpose: QuizPurpose.FINAL_ASSESSMENT);

        // Total items = 4 (2 lessons + 1 chapter quiz + 1 final quiz). Completed = 2 (1 lesson + 1 chapter quiz). Percentage = 50.00%
        AccessMock
            .Setup(a => a.CheckCertificateAsync(learnerId, course.CourseId))
            .ReturnsAsync((false, "Incomplete requirements"));

        // Act
        var result = await Service.GetCourseProgressAsync(learnerId, course.CourseId);

        // Assert
        result.Should().NotBeNull();
        result!.CompletionPercentage.Should().Be(50.00m);
        result.IsCompleted.Should().BeFalse();
        result.CompletedLessonsCount.Should().Be(1);
        result.TotalLessonsCount.Should().Be(2);
    }

    [Fact]
    public async Task GetCourseProgressAsync_WhenCourseAccessDenied_ReturnsNull()
    {
        // Arrange
        CourseAccessMock
            .Setup(c => c.CanAccessCourseAsync(100, 1, false))
            .ReturnsAsync(false);

        // Act
        var result = await Service.GetCourseProgressAsync(1, 100);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCourseProgressAsync_WhenLearnerNotEnrolled_ReturnsNull()
    {
        // Arrange
        var course = CreateCourse(100);

        // Act
        var result = await Service.GetCourseProgressAsync(1, course.CourseId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCourseProgressAsync_WhenCourseHasNoLessonsOrAssessments_ReturnsZeroPercent()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        // Act
        var result = await Service.GetCourseProgressAsync(learnerId, course.CourseId);

        // Assert
        result.Should().NotBeNull();
        result!.TotalLessonsCount.Should().Be(0);
        result.CompletedLessonsCount.Should().Be(0);
        result.CompletionPercentage.Should().Be(0m);
        result.LessonProgresses.Should().BeEmpty();
    }

    [Fact]
    public async Task GetCourseProgressAsync_When100PercentButCertificateCheckFailsAndNoCert_IsCompletedIsFalse()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);
        var lesson = CreateLesson(1, course.CourseId);
        CreateLessonProgress(1, enr.EnrollmentId, lesson.LessonId, isCompleted: true);

        // Completion percentage is 100%, but access check returns false
        AccessMock
            .Setup(a => a.CheckCertificateAsync(learnerId, course.CourseId))
            .ReturnsAsync((false, "Pending instructor evaluation"));

        // Act
        var result = await Service.GetCourseProgressAsync(learnerId, course.CourseId);

        // Assert
        result.Should().NotBeNull();
        result!.CompletionPercentage.Should().Be(100.00m);
        result.IsCompleted.Should().BeFalse();
    }
}
