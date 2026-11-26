using System;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumCommentServiceTests;

public class GetCommentsByLessonIdAsyncTests : ForumCommentServiceTestBase
{
    [Fact]
    public async Task GetCommentsByLessonIdAsync_WhenCommentsExist_ReturnsTwoLevelHierarchyAndAuthorInfo()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var student = CreateUser(2, "Student Alice", "alice@example.com", roleName: "Learner", avatarUrl: "https://example.com/alice.png");
        var course = CreateCourse(10, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        var rootComment = CreateComment(100, postId: null, authorId: student.UserId, lessonId: lesson.LessonId, content: "How does this lesson work?", depthLevel: 1);
        var replyComment = CreateComment(101, postId: null, authorId: instructor.UserId, lessonId: lesson.LessonId, content: "Here is the explanation.", depthLevel: 2, parentCommentId: rootComment.CommentId);

        // Act
        var result = await Service.GetCommentsByLessonIdAsync(lesson.LessonId, currentUserId: student.UserId, isAdmin: false);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);

        var parentDto = result[0];
        parentDto.CommentId.Should().Be(rootComment.CommentId);
        parentDto.LessonId.Should().Be(lesson.LessonId);
        parentDto.PostId.Should().BeNull();
        parentDto.AuthorName.Should().Be("Student Alice");
        parentDto.AuthorAvatar.Should().Be("https://example.com/alice.png");
        parentDto.IsInstructor.Should().BeFalse();
        parentDto.IsAuthor.Should().BeTrue();

        parentDto.Replies.Should().HaveCount(1);
        var replyDto = parentDto.Replies[0];
        replyDto.CommentId.Should().Be(replyComment.CommentId);
        replyDto.LessonId.Should().Be(lesson.LessonId);
        replyDto.AuthorName.Should().Be("Instructor John");
        replyDto.IsInstructor.Should().BeTrue();
    }

    [Fact]
    public async Task GetCommentsByLessonIdAsync_WhenLessonNotFound_ThrowsInvalidOperationException()
    {
        // Act
        Func<Task> act = async () => await Service.GetCommentsByLessonIdAsync(99999);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài học không tồn tại.");
    }

    [Fact]
    public async Task GetCommentsByLessonIdAsync_WhenAuthorIsCourseInstructor_SetsIsInstructorTrue()
    {
        // Arrange
        var instructor = CreateUser(5, "Teacher Bob", "bob@example.com", roleName: "Learner"); // even if role says Learner
        var course = CreateCourse(15, instructor.UserId);
        var lesson = CreateLesson(25, course.CourseId);

        CreateComment(200, postId: null, authorId: instructor.UserId, lessonId: lesson.LessonId, content: "Official course notice.");

        // Act
        var result = await Service.GetCommentsByLessonIdAsync(lesson.LessonId);

        // Assert
        result.Should().HaveCount(1);
        result[0].IsInstructor.Should().BeTrue();
    }

    [Fact]
    public async Task GetCommentsByLessonIdAsync_WhenCommentIsAnonymousAndUserIsNotAdmin_MasksAuthor()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var student = CreateUser(2, "Secret Student", "secret@example.com", roleName: "Learner");
        var course = CreateCourse(10, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        CreateComment(300, postId: null, authorId: student.UserId, lessonId: lesson.LessonId, content: "Anonymous question", isAnonymous: true);

        // Act
        var result = await Service.GetCommentsByLessonIdAsync(lesson.LessonId, currentUserId: null, isAdmin: false);

        // Assert
        result.Should().HaveCount(1);
        result[0].AuthorId.Should().Be(0);
        result[0].AuthorName.Should().Be("Học viên ẩn danh");
        result[0].AuthorAvatar.Should().BeNull();
        result[0].AuthorRole.Should().Be("Learner");
        result[0].IsInstructor.Should().BeFalse();
    }

    [Fact]
    public async Task GetCommentsByLessonIdAsync_WhenCommentIsDeleted_ExcludesFromResults()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com");
        var student = CreateUser(2, "Student Alice", "alice@example.com");
        var course = CreateCourse(10, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        CreateComment(400, postId: null, authorId: student.UserId, lessonId: lesson.LessonId, content: "Active comment", status: "ACTIVE");
        CreateComment(401, postId: null, authorId: student.UserId, lessonId: lesson.LessonId, content: "Deleted comment", status: "DELETED");

        // Act
        var result = await Service.GetCommentsByLessonIdAsync(lesson.LessonId);

        // Assert
        result.Should().HaveCount(1);
        result[0].CommentId.Should().Be(400);
    }
}
