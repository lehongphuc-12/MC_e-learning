using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingSubmissionServiceTests;

public class GetSubmissionsForInstructorAsyncTests : SpeakingSubmissionServiceTestBase
{
    [Fact]
    public async Task GetSubmissionsForInstructorAsync_WhenSubmissionsExistAcrossCourses_ReturnsAllForInstructor()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var otherInstructor = CreateUser(2, "Other Instructor", "other@example.com");
        var learner = CreateUser(3, "Learner", "learner@example.com");

        var course1 = CreateCourse(100, instructor.UserId);
        var course2 = CreateCourse(200, otherInstructor.UserId);

        var lesson1 = CreateLesson(10, course1.CourseId);
        var lesson2 = CreateLesson(20, course2.CourseId);

        var mySub = CreateSubmission(1, learner.UserId, lesson1.LessonId, null);
        var otherSub = CreateSubmission(2, learner.UserId, lesson2.LessonId, null);

        // Act
        var result = (await Service.GetSubmissionsForInstructorAsync(instructor.UserId)).ToList();

        // Assert
        result.Should().HaveCount(1);
        result.First().SubmissionId.Should().Be(mySub.SubmissionId);
    }

    [Fact]
    public async Task GetSubmissionsForInstructorAsync_WhenInstructorHasNoSubmissions_ReturnsEmptyCollection()
    {
        // Act
        var result = await Service.GetSubmissionsForInstructorAsync(instructorId: 9999);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSubmissionsForInstructorAsync_WhenSubmissionsCoverBothLessonAndScriptAssignments_ReturnsBoth()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);

        var lesson = CreateLesson(10, course.CourseId);
        var finalScript = CreateSpeakingScript(30, course.CourseId, null, null, "Final", SpeakingScope.FINAL);

        var lessonSub = CreateSubmission(1, learner.UserId, lesson.LessonId, null);
        var finalSub = CreateSubmission(2, learner.UserId, null, finalScript.ScriptId);

        // Act
        var result = (await Service.GetSubmissionsForInstructorAsync(instructor.UserId)).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Select(s => s.SubmissionId).Should().Contain(new[] { lessonSub.SubmissionId, finalSub.SubmissionId });
    }
}
