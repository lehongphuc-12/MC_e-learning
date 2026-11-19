using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.LearningAccessServiceTests;

public class GetLessonLocksAsyncTests : LearningAccessServiceTestBase
{
    [Fact]
    public async Task GetLessonLocksAsync_WhenFirstLessonAndCompletedSequentially_UnlocksLessons()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);

        // Lesson 1 has no video, so it is completed without needing progress record
        // Act
        var result = await Service.GetLessonLocksAsync(learnerId, course.CourseId);

        // Assert
        result.Should().ContainKey(lesson1.LessonId);
        result[lesson1.LessonId].Should().BeNull(); // First lesson always unlocked
        result.Should().ContainKey(lesson2.LessonId);
        result[lesson2.LessonId].Should().BeNull(); // Unlocked because lesson 1 had no video or practice
    }

    [Fact]
    public async Task GetLessonLocksAsync_WhenPreviousLessonVideoIncomplete_LocksNextLesson()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);
        CreateLessonVideoMaterial(10, course.CourseId, lesson1.LessonId);

        // No lesson progress created for lesson 1 -> video incomplete

        // Act
        var result = await Service.GetLessonLocksAsync(learnerId, course.CourseId);

        // Assert
        result[lesson1.LessonId].Should().BeNull();
        result[lesson2.LessonId].Should().Be($"Vui lòng hoàn thành video của bài học {lesson1.LessonId} trước.");
    }

    [Fact]
    public async Task GetLessonLocksAsync_WhenPreviousLessonPracticeQuizNotPassed_LocksNextLesson()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);

        // Active practice quiz for lesson 1
        var quiz = CreateQuiz(10, course.CourseId, lesson1.LessonId, moduleId: null, purpose: QuizPurpose.PRACTICE);
        // Not passed by learner

        // Act
        var result = await Service.GetLessonLocksAsync(learnerId, course.CourseId);

        // Assert
        result[lesson1.LessonId].Should().BeNull();
        result[lesson2.LessonId].Should().Be($"Vui lòng đạt tất cả bài tập luyện tập của bài học {lesson1.LessonId} trước.");
    }

    [Fact]
    public async Task GetLessonLocksAsync_WhenPreviousModuleChapterAssessmentNotPassed_LocksNextModuleLesson()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        var mod1 = CreateModule(1, course.CourseId, "Module 1", orderIndex: 1);
        var mod2 = CreateModule(2, course.CourseId, "Module 2", orderIndex: 2);

        var lesson1 = CreateLesson(1, course.CourseId, moduleId: mod1.ModuleId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, moduleId: mod2.ModuleId, orderIndex: 1);

        // Chapter assessment for module 1
        var chapterQuiz = CreateQuiz(20, course.CourseId, lessonId: null, moduleId: mod1.ModuleId, purpose: QuizPurpose.CHAPTER_ASSESSMENT);
        // Not passed

        // Act
        var result = await Service.GetLessonLocksAsync(learnerId, course.CourseId);

        // Assert
        result[lesson1.LessonId].Should().BeNull();
        result[lesson2.LessonId].Should().Be("Vui lòng đạt bài đánh giá chương trước.");
    }

    [Fact]
    public async Task GetLessonLocksAsync_WhenCourseHasNoLessons_ReturnsEmptyDictionary()
    {
        // Arrange
        var course = CreateCourse(100);

        // Act
        var result = await Service.GetLessonLocksAsync(1, course.CourseId);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetLessonLocksAsync_WhenMultipleLessonsLockedCascade_PropagatesPriorLockReason()
    {
        // Arrange
        var learnerId = 1;
        var course = CreateCourse(100);
        var enr = CreateEnrollment(1, learnerId, course.CourseId);

        var lesson1 = CreateLesson(1, course.CourseId, orderIndex: 1);
        var lesson2 = CreateLesson(2, course.CourseId, orderIndex: 2);
        var lesson3 = CreateLesson(3, course.CourseId, orderIndex: 3);

        CreateLessonVideoMaterial(10, course.CourseId, lesson1.LessonId);

        // Act
        var result = await Service.GetLessonLocksAsync(learnerId, course.CourseId);

        // Assert
        var expectedReason = $"Vui lòng hoàn thành video của bài học {lesson1.LessonId} trước.";
        result[lesson1.LessonId].Should().BeNull();
        result[lesson2.LessonId].Should().Be(expectedReason);
        result[lesson3.LessonId].Should().Be(expectedReason); // Cascaded prior lock
    }
}
