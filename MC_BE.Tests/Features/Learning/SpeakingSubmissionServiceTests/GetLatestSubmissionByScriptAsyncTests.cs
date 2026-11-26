using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.Enums;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingSubmissionServiceTests;

public class GetLatestSubmissionByScriptAsyncTests : SpeakingSubmissionServiceTestBase
{
    [Fact]
    public async Task GetLatestSubmissionByScriptAsync_WhenSubmissionExists_ReturnsMappedDto()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var script = CreateSpeakingScript(30, course.CourseId, null, null, "Final Assessment", SpeakingScope.FINAL);

        var submission = CreateSubmission(
            1, learner.UserId, null, script.ScriptId,
            status: SpeakingSubmissionStatus.GRADED,
            score: 92,
            feedback: "Excellent execution!"
        );

        // Act
        var result = await Service.GetLatestSubmissionByScriptAsync(learner.UserId, script.ScriptId);

        // Assert
        result.Should().NotBeNull();
        result!.SubmissionId.Should().Be(submission.SubmissionId);
        result.ScriptId.Should().Be(script.ScriptId);
        result.Score.Should().Be(92);
        result.Scope.Should().Be(SpeakingScope.FINAL.ToString());
        result.IsPassed.Should().BeTrue();
    }

    [Fact]
    public async Task GetLatestSubmissionByScriptAsync_WhenNoSubmissionExists_ReturnsNull()
    {
        // Act
        var result = await Service.GetLatestSubmissionByScriptAsync(learnerId: 999, scriptId: 888);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetLatestSubmissionByScriptAsync_WhenMultipleSubmissionsExist_ReturnsMostRecent()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var script = CreateSpeakingScript(30, course.CourseId, null, null, "Chapter Review", SpeakingScope.CHAPTER);

        var first = CreateSubmission(1, learner.UserId, null, script.ScriptId, score: 60);
        first.SubmittedAt = DateTime.UtcNow.AddDays(-1);
        DbContext.SaveChanges();

        var recent = CreateSubmission(2, learner.UserId, null, script.ScriptId, score: 85);
        recent.SubmittedAt = DateTime.UtcNow;
        DbContext.SaveChanges();

        // Act
        var result = await Service.GetLatestSubmissionByScriptAsync(learner.UserId, script.ScriptId);

        // Assert
        result.Should().NotBeNull();
        result!.SubmissionId.Should().Be(recent.SubmissionId);
        result.Score.Should().Be(85);
    }
}
