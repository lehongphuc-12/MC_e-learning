using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using CloudinaryDotNet.Actions;
using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Learning.DTOs;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Learning.SpeakingSubmissionServiceTests;

public class SubmitSpeakingAssignmentAsyncTests : SpeakingSubmissionServiceTestBase
{
    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenFirstTimeSubmissionByLesson_CreatesSubmissionSuccessfully()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var module = CreateModule(10, course.CourseId);
        var lesson = CreateLesson(20, course.CourseId, module.ModuleId);
        var script = CreateSpeakingScript(30, course.CourseId, module.ModuleId, lesson.LessonId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        var audioFile = CreateMockAudioFile("test.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            AudioFile = audioFile,
            Note = "First attempt"
        };

        // Act
        var result = await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.LessonId.Should().Be(lesson.LessonId);
        result.Status.Should().Be(SpeakingSubmissionStatus.SUBMITTED.ToString());
        result.AudioUrl.Should().Be("https://res.cloudinary.com/demo/video/upload/sample.mp3");
        result.Note.Should().Be("First attempt");
        result.Score.Should().BeNull();

        var inDb = await SubmissionRepository.GetLatestByLearnerAndLessonAsync(learner.UserId, lesson.LessonId);
        inDb.Should().NotBeNull();
        inDb!.Status.Should().Be(SpeakingSubmissionStatus.SUBMITTED);
        inDb.AudioUrl.Should().Be("https://res.cloudinary.com/demo/video/upload/sample.mp3");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenFirstTimeSubmissionByScript_CreatesSubmissionSuccessfully()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var script = CreateSpeakingScript(30, course.CourseId, null, null, "Final Assessment", SpeakingScope.FINAL);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        var audioFile = CreateMockAudioFile("final_submission.wav");
        var request = new CreateSpeakingSubmissionRequest
        {
            ScriptId = script.ScriptId,
            AudioFile = audioFile,
            Note = "Final speech attempt"
        };

        // Act
        var result = await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.ScriptId.Should().Be(script.ScriptId);
        result.Scope.Should().Be(SpeakingScope.FINAL.ToString());
        result.Status.Should().Be(SpeakingSubmissionStatus.SUBMITTED.ToString());
        result.AudioUrl.Should().Be("https://res.cloudinary.com/demo/video/upload/sample.mp3");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenPreviousSubmissionFailedUnder80_AllowsResubmissionAndOverwrites()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);
        var script = CreateSpeakingScript(30, course.CourseId, null, lesson.LessonId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        // Previous submission that was graded < 80
        var oldSubmission = CreateSubmission(
            1, learner.UserId, lesson.LessonId, script.ScriptId,
            audioUrl: "https://old.url/audio.mp3",
            status: SpeakingSubmissionStatus.NEEDS_RESUBMISSION,
            score: 65,
            feedback: "Need clearer pronunciation",
            gradedById: instructor.UserId
        );

        var newAudioFile = CreateMockAudioFile("retry.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            ScriptId = script.ScriptId,
            AudioFile = newAudioFile,
            Note = "Retrying after feedback"
        };

        // Act
        var result = await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.SubmissionId.Should().Be(oldSubmission.SubmissionId); // Overwritten same ID
        result.Status.Should().Be(SpeakingSubmissionStatus.SUBMITTED.ToString());
        result.Score.Should().BeNull();
        result.Feedback.Should().BeNull();
        result.GradedById.Should().BeNull();
        result.Note.Should().Be("Retrying after feedback");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenAudioFileIsNull_ThrowsArgumentException()
    {
        // Arrange
        var learnerId = 2;
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = 20,
            AudioFile = null!
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learnerId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Audio file is required.*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenAudioFileHasInvalidExtension_ThrowsArgumentException()
    {
        // Arrange
        var learnerId = 2;
        var invalidFile = CreateMockAudioFile("test.pdf", "application/pdf");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = 20,
            AudioFile = invalidFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learnerId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Invalid audio file format*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenNeitherLessonIdNorScriptIdProvided_ThrowsArgumentException()
    {
        // Arrange
        var learnerId = 2;
        var audioFile = CreateMockAudioFile("audio.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            AudioFile = audioFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learnerId, request);

        // Assert
        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*Vui lòng cung cấp LessonId hoặc ScriptId*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenScriptIdNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var learnerId = 2;
        var audioFile = CreateMockAudioFile("audio.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            ScriptId = 9999,
            AudioFile = audioFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learnerId, request);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Không tìm thấy bài tập nói với ID 9999*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenLessonIdNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var learnerId = 2;
        var audioFile = CreateMockAudioFile("audio.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = 9999,
            AudioFile = audioFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learnerId, request);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("*Lesson with ID 9999 was not found.*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenUserHasNoAccessToCourse_ThrowsInvalidOperationException()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        CourseAccessMock.Setup(c => c.CanAccessCourseAsync(course.CourseId, learner.UserId, false))
            .ReturnsAsync(false);

        var audioFile = CreateMockAudioFile("audio.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            AudioFile = audioFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Bạn không có quyền truy cập khóa học này.*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenLearnerNotEnrolledInCourse_ThrowsInvalidOperationException()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        // Enrollment NOT created for learner
        var audioFile = CreateMockAudioFile("audio.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            AudioFile = audioFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*You must be enrolled in this course to submit assignments.*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenSubmissionPendingGrading_ThrowsInvalidOperationException()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        // Pending submission (Score is null, Status is SUBMITTED)
        CreateSubmission(1, learner.UserId, lesson.LessonId, null, status: SpeakingSubmissionStatus.SUBMITTED, score: null);

        var audioFile = CreateMockAudioFile("audio.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            AudioFile = audioFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Bài nộp của bạn đang chờ giảng viên chấm, không thể nộp lại lúc này.*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenAlreadyPassedWithScore80OrAbove_ThrowsInvalidOperationException()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        // Passed submission (Score = 85)
        CreateSubmission(1, learner.UserId, lesson.LessonId, null, status: SpeakingSubmissionStatus.GRADED, score: 85);

        var audioFile = CreateMockAudioFile("audio.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            AudioFile = audioFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Bạn đã đạt yêu cầu bài thi nói này (≥ 80 điểm), không cần nộp lại.*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenCloudinaryFails_ThrowsInvalidOperationException()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        CloudinaryServiceMock.Setup(c => c.UploadVideoAsync(It.IsAny<IFormFile>(), It.IsAny<string>()))
            .ReturnsAsync((VideoUploadResult)null!);

        var audioFile = CreateMockAudioFile("audio.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            AudioFile = audioFile
        };

        // Act
        var act = async () => await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Failed to upload audio file to storage.*");
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenAudioFileHasUppercaseExtension_AcceptsAndUploadsSuccessfully()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        var audioFile = CreateMockAudioFile("SPEECH.WAV", "audio/wav");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            AudioFile = audioFile
        };

        // Act
        var result = await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(SpeakingSubmissionStatus.SUBMITTED.ToString());
    }

    [Fact]
    public async Task SubmitSpeakingAssignmentAsync_WhenPreviousScoreExactly79Point9_AllowsResubmission()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor", "inst@example.com");
        var learner = CreateUser(2, "Learner", "learner@example.com");
        var course = CreateCourse(100, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);
        CreateEnrollment(1, learner.UserId, course.CourseId);

        // Score 79.9 is below 80 threshold
        CreateSubmission(1, learner.UserId, lesson.LessonId, null, status: SpeakingSubmissionStatus.NEEDS_RESUBMISSION, score: 79.9m);

        var audioFile = CreateMockAudioFile("retry.mp3");
        var request = new CreateSpeakingSubmissionRequest
        {
            LessonId = lesson.LessonId,
            AudioFile = audioFile,
            Note = "Boundary score retry"
        };

        // Act
        var result = await Service.SubmitSpeakingAssignmentAsync(learner.UserId, request);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be(SpeakingSubmissionStatus.SUBMITTED.ToString());
        result.Score.Should().BeNull();
    }
}
