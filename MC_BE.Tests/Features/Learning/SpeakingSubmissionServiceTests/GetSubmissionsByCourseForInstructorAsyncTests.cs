using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingSubmissionServiceTests;

public class GetSubmissionsByCourseForInstructorAsyncTests : SpeakingSubmissionServiceTestBase
{
    [Fact]
    public async Task GetSubmissionsByCourseForInstructorAsync_WhenInstructorOwnsCourse_ReturnsCourseSubmissions()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(10, course.CourseId);

        var sub = CreateSubmission(1, learner.UserId, lesson.LessonId, null);

        // Act
        var result = (await Service.GetSubmissionsByCourseForInstructorAsync(instructor.UserId, course.CourseId)).ToList();

        // Assert
        result.Should().HaveCount(1);
        result.First().SubmissionId.Should().Be(sub.SubmissionId);
        result.First().CourseId.Should().Be(course.CourseId);
    }

    [Fact]
    public async Task GetSubmissionsByCourseForInstructorAsync_WhenInstructorDoesNotOwnCourse_ReturnsEmptyCollection()
    {
        // Arrange
        var realInstructor = CreateUser(1, "Real Instructor", "real@example.com");
        var intruderInstructor = CreateUser(2, "Intruder Instructor", "intruder@example.com");
        var learner = CreateUser(3, "Learner", "learner@example.com");

        var course = CreateCourse(100, realInstructor.UserId);
        var lesson = CreateLesson(10, course.CourseId);
        CreateSubmission(1, learner.UserId, lesson.LessonId, null);

        // Act
        var result = (await Service.GetSubmissionsByCourseForInstructorAsync(intruderInstructor.UserId, course.CourseId)).ToList();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSubmissionsByCourseForInstructorAsync_WhenCourseHasNoSubmissions_ReturnsEmptyCollection()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var course = CreateCourse(100, instructor.UserId);

        // Act
        var result = await Service.GetSubmissionsByCourseForInstructorAsync(instructor.UserId, course.CourseId);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSubmissionsByCourseForInstructorAsync_WhenMixedScopesInCourse_ReturnsAllSubmissionsOwned()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);

        var lesson = CreateLesson(10, course.CourseId);
        var script = CreateSpeakingScript(30, course.CourseId, null, null, "Final", SpeakingScope.FINAL);

        var subLesson = CreateSubmission(1, learner.UserId, lesson.LessonId, null);
        var subScript = CreateSubmission(2, learner.UserId, null, script.ScriptId);

        // Act
        var result = (await Service.GetSubmissionsByCourseForInstructorAsync(instructor.UserId, course.CourseId)).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Select(s => s.SubmissionId).Should().Contain(new[] { subLesson.SubmissionId, subScript.SubmissionId });
    }
}
