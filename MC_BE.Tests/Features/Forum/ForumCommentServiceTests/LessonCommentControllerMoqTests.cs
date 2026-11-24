using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.Controllers;
using MC_BE.Features.Forum.DTOs;
using MC_BE.Features.Forum.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumCommentServiceTests;

public class LessonCommentControllerMoqTests
{
    private readonly Mock<IForumCommentService> _mockCommentService;
    private readonly Mock<IForumInteractionService> _mockInteractionService;
    private readonly ForumCommentsController _controller;

    public LessonCommentControllerMoqTests()
    {
        _mockCommentService = new Mock<IForumCommentService>();
        _mockInteractionService = new Mock<IForumInteractionService>();

        _controller = new ForumCommentsController(_mockCommentService.Object, _mockInteractionService.Object);
    }

    private void SetUserContext(int userId, string role = "Learner")
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
    }

    [Fact]
    public async Task GetLessonComments_WhenLessonExists_ReturnsOkWithComments()
    {
        // Arrange
        int lessonId = 10;
        var expectedComments = new List<ForumCommentDto>
        {
            new ForumCommentDto
            {
                CommentId = 1,
                LessonId = lessonId,
                Content = "Root comment",
                AuthorName = "Student A",
                Replies = new List<ForumCommentDto>
                {
                    new ForumCommentDto
                    {
                        CommentId = 2,
                        LessonId = lessonId,
                        ParentCommentId = 1,
                        Content = "Reply by instructor",
                        AuthorName = "Instructor B",
                        IsInstructor = true
                    }
                }
            }
        };

        _mockCommentService
            .Setup(s => s.GetCommentsByLessonIdAsync(lessonId, It.IsAny<int?>(), It.IsAny<bool>()))
            .ReturnsAsync(expectedComments);

        // Act
        var actionResult = await _controller.GetLessonComments(lessonId);

        // Assert
        var okResult = actionResult.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as ApiResponse<List<ForumCommentDto>>;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Data.Should().HaveCount(1);
        response.Data![0].Replies.Should().HaveCount(1);
        response.Data[0].Replies[0].IsInstructor.Should().BeTrue();

        _mockCommentService.Verify(s => s.GetCommentsByLessonIdAsync(lessonId, null, false), Times.Once);
    }

    [Fact]
    public async Task GetLessonComments_WhenLessonDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        int lessonId = 999;
        _mockCommentService
            .Setup(s => s.GetCommentsByLessonIdAsync(lessonId, It.IsAny<int?>(), It.IsAny<bool>()))
            .ThrowsAsync(new InvalidOperationException("Bài học không tồn tại."));

        // Act
        var actionResult = await _controller.GetLessonComments(lessonId);

        // Assert
        var notFoundResult = actionResult.Result as NotFoundObjectResult;
        notFoundResult.Should().NotBeNull();
        var response = notFoundResult!.Value as ApiResponse<List<ForumCommentDto>>;
        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Message.Should().Be("Bài học không tồn tại.");
    }

    [Fact]
    public async Task CreateLessonComment_WhenValidRequest_ReturnsOkWithCreatedComment()
    {
        // Arrange
        int lessonId = 10;
        int userId = 42;
        SetUserContext(userId);

        var dto = new CreateCommentDto
        {
            Content = "Hello from unit test",
            IsAnonymous = false
        };

        var expectedDto = new ForumCommentDto
        {
            CommentId = 101,
            LessonId = lessonId,
            Content = "Hello from unit test",
            AuthorId = userId,
            AuthorName = "Alice"
        };

        _mockCommentService
            .Setup(s => s.CreateLessonCommentAsync(lessonId, userId, dto))
            .ReturnsAsync(expectedDto);

        // Act
        var actionResult = await _controller.CreateLessonComment(lessonId, dto);

        // Assert
        var okResult = actionResult.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as ApiResponse<ForumCommentDto>;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Data!.CommentId.Should().Be(101);

        _mockCommentService.Verify(s => s.CreateLessonCommentAsync(lessonId, userId, dto), Times.Once);
    }

    [Fact]
    public async Task CreateLessonComment_WhenReplyingToParent_CallsServiceWithParentCommentId()
    {
        // Arrange
        int lessonId = 10;
        int userId = 42;
        SetUserContext(userId, "Instructor");

        var dto = new CreateCommentDto
        {
            ParentCommentId = 101,
            Content = "Reply answer"
        };

        var expectedDto = new ForumCommentDto
        {
            CommentId = 102,
            LessonId = lessonId,
            ParentCommentId = 101,
            DepthLevel = 2,
            Content = "Reply answer",
            AuthorId = userId,
            IsInstructor = true
        };

        _mockCommentService
            .Setup(s => s.CreateLessonCommentAsync(lessonId, userId, dto))
            .ReturnsAsync(expectedDto);

        // Act
        var actionResult = await _controller.CreateLessonComment(lessonId, dto);

        // Assert
        var okResult = actionResult.Result as OkObjectResult;
        okResult.Should().NotBeNull();
        var response = okResult!.Value as ApiResponse<ForumCommentDto>;
        response.Should().NotBeNull();
        response!.Success.Should().BeTrue();
        response.Data!.ParentCommentId.Should().Be(101);
        response.Data.DepthLevel.Should().Be(2);

        _mockCommentService.Verify(s => s.CreateLessonCommentAsync(lessonId, userId, dto), Times.Once);
    }

    [Fact]
    public async Task CreateLessonComment_WhenLessonNotFound_ReturnsBadRequest()
    {
        // Arrange
        int lessonId = 999;
        int userId = 42;
        SetUserContext(userId);

        var dto = new CreateCommentDto { Content = "Test" };

        _mockCommentService
            .Setup(s => s.CreateLessonCommentAsync(lessonId, userId, dto))
            .ThrowsAsync(new InvalidOperationException("Bài học không tồn tại."));

        // Act
        var actionResult = await _controller.CreateLessonComment(lessonId, dto);

        // Assert
        var badRequestResult = actionResult.Result as BadRequestObjectResult;
        badRequestResult.Should().NotBeNull();
        var response = badRequestResult!.Value as ApiResponse<ForumCommentDto>;
        response.Should().NotBeNull();
        response!.Success.Should().BeFalse();
        response.Message.Should().Be("Bài học không tồn tại.");
    }
}
