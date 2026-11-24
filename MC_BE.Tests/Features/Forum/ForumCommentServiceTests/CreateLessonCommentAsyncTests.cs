using System;
using System.Threading.Tasks;
using FluentAssertions;
using MC_BE.Features.Forum.DTOs;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MC_BE.Tests.Features.Forum.ForumCommentServiceTests;

public class CreateLessonCommentAsyncTests : ForumCommentServiceTestBase
{
    [Fact]
    public async Task CreateLessonCommentAsync_WhenValidTopLevelComment_CreatesSuccessfully()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var student = CreateUser(2, "Student Alice", "alice@example.com", roleName: "Learner", avatarUrl: "https://example.com/alice.png");
        var course = CreateCourse(10, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        var dto = new CreateCommentDto
        {
            Content = "This is a great lesson!",
            ImageUrl = "https://example.com/image.png",
            IsAnonymous = false
        };

        // Act
        var result = await Service.CreateLessonCommentAsync(lesson.LessonId, student.UserId, dto);

        // Assert
        result.Should().NotBeNull();
        result.CommentId.Should().BeGreaterThan(0);
        result.LessonId.Should().Be(lesson.LessonId);
        result.PostId.Should().BeNull();
        result.DepthLevel.Should().Be(1);
        result.ParentCommentId.Should().BeNull();
        result.Content.Should().Be("This is a great lesson!");
        result.ImageUrl.Should().Be("https://example.com/image.png");
        result.AuthorId.Should().Be(student.UserId);
        result.AuthorName.Should().Be("Student Alice");
        result.AuthorAvatar.Should().Be("https://example.com/alice.png");
        result.IsInstructor.Should().BeFalse();
        result.IsAuthor.Should().BeTrue();

        var dbComment = await DbContext.ForumComments.FirstOrDefaultAsync(c => c.CommentId == result.CommentId);
        dbComment.Should().NotBeNull();
        dbComment!.LessonId.Should().Be(lesson.LessonId);
        dbComment.PostId.Should().BeNull();
        dbComment.Status.Should().Be("ACTIVE");
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenReplyingToParent_CreatesChildReplyWithDepth2()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var student = CreateUser(2, "Student Alice", "alice@example.com");
        var course = CreateCourse(10, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        var parent = CreateComment(100, postId: null, authorId: student.UserId, lessonId: lesson.LessonId, depthLevel: 1);

        var dto = new CreateCommentDto
        {
            ParentCommentId = parent.CommentId,
            Content = "I am replying to the question."
        };

        // Act
        var result = await Service.CreateLessonCommentAsync(lesson.LessonId, instructor.UserId, dto);

        // Assert
        result.Should().NotBeNull();
        result.LessonId.Should().Be(lesson.LessonId);
        result.PostId.Should().BeNull();
        result.DepthLevel.Should().Be(2);
        result.ParentCommentId.Should().Be(parent.CommentId);
        result.AuthorId.Should().Be(instructor.UserId);
        result.IsInstructor.Should().BeTrue();
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenReplyingToLevel2Comment_FlattensParentToRootComment()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var student = CreateUser(2, "Student Alice", "alice@example.com");
        var course = CreateCourse(10, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        var root = CreateComment(100, postId: null, authorId: student.UserId, lessonId: lesson.LessonId, depthLevel: 1);
        var child = CreateComment(101, postId: null, authorId: instructor.UserId, lessonId: lesson.LessonId, depthLevel: 2, parentCommentId: root.CommentId);

        var dto = new CreateCommentDto
        {
            ParentCommentId = child.CommentId,
            Content = "Replying to a reply."
        };

        // Act
        var result = await Service.CreateLessonCommentAsync(lesson.LessonId, student.UserId, dto);

        // Assert
        result.Should().NotBeNull();
        result.DepthLevel.Should().Be(2);
        result.ParentCommentId.Should().Be(root.CommentId); // flattened to root
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenLessonNotFound_ThrowsInvalidOperationException()
    {
        // Arrange
        var student = CreateUser(2, "Student Alice", "alice@example.com");
        var dto = new CreateCommentDto { Content = "Test comment" };

        // Act
        Func<Task> act = async () => await Service.CreateLessonCommentAsync(99999, student.UserId, dto);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bài học không tồn tại.");
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenParentCommentBelongsToDifferentLesson_ThrowsInvalidOperationException()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com");
        var student = CreateUser(2, "Student Alice", "alice@example.com");
        var course = CreateCourse(10, instructor.UserId);
        var lesson1 = CreateLesson(20, course.CourseId);
        var lesson2 = CreateLesson(21, course.CourseId);

        var commentOnLesson2 = CreateComment(100, postId: null, authorId: student.UserId, lessonId: lesson2.LessonId);

        var dto = new CreateCommentDto
        {
            ParentCommentId = commentOnLesson2.CommentId,
            Content = "Cross-lesson reply attempt"
        };

        // Act
        Func<Task> act = async () => await Service.CreateLessonCommentAsync(lesson1.LessonId, student.UserId, dto);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Bình luận cha không tồn tại.");
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenCommentIsAnonymous_MasksAuthorDetails()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com");
        var student = CreateUser(2, "Student Alice", "alice@example.com");
        var course = CreateCourse(10, instructor.UserId);
        var lesson = CreateLesson(20, course.CourseId);

        var dto = new CreateCommentDto
        {
            Content = "Anonymous feedback",
            IsAnonymous = true
        };

        // Act
        var result = await Service.CreateLessonCommentAsync(lesson.LessonId, student.UserId, dto);

        // Assert
        result.Should().NotBeNull();
        result.AuthorId.Should().Be(0);
        result.AuthorName.Should().Be("Học viên ẩn danh");
        result.AuthorAvatar.Should().BeNull();
        result.AuthorRole.Should().Be("Learner");
        result.IsInstructor.Should().BeFalse();
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenStudentComments_CreatesNotificationForCourseInstructor()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var student = CreateUser(2, "Nguyễn Văn B", "studentb@example.com", roleName: "Learner");
        var course = CreateCourse(10, instructor.UserId, title: "MC Tiệc Cưới");
        var lesson = CreateLesson(58, course.CourseId, title: "Buổi 2: Kỹ năng trao đổi");

        var dto = new CreateCommentDto
        {
            Content = "Cô ơi cho em hỏi phần này ạ.",
            IsAnonymous = false
        };

        // Act
        await Service.CreateLessonCommentAsync(lesson.LessonId, student.UserId, dto);

        // Assert
        var notification = await DbContext.Notifications.FirstOrDefaultAsync(n => n.UserId == instructor.UserId);
        notification.Should().NotBeNull();
        notification!.Type.Should().Be("lesson_comment");
        notification.Url.Should().Be("/courses/10/learn?lessonId=58");
        notification.Message.Should().Contain("Nguyễn Văn B");
        notification.Message.Should().Contain("Buổi 2: Kỹ năng trao đổi");
        notification.Message.Should().Contain("MC Tiệc Cưới");
        notification.IsRead.Should().BeFalse();
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenStudentCommentsAnonymously_DoesNotRevealRealNameInNotification()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var student = CreateUser(2, "Trần Thị Bí Mật", "secret@example.com", roleName: "Learner");
        var course = CreateCourse(10, instructor.UserId, title: "MC Sự Kiện");
        var lesson = CreateLesson(58, course.CourseId, title: "Buổi 1: Mở đầu");

        var dto = new CreateCommentDto
        {
            Content = "Câu hỏi ẩn danh",
            IsAnonymous = true
        };

        // Act
        await Service.CreateLessonCommentAsync(lesson.LessonId, student.UserId, dto);

        // Assert
        var notification = await DbContext.Notifications.FirstOrDefaultAsync(n => n.UserId == instructor.UserId);
        notification.Should().NotBeNull();
        notification!.Url.Should().Be("/courses/10/learn?lessonId=58");
        notification.Message.Should().NotContain("Trần Thị Bí Mật");
        notification.Message.Should().Contain("Một học viên ẩn danh");
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenInstructorCommentsOnOwnLesson_DoesNotNotifySelf()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var course = CreateCourse(10, instructor.UserId, title: "MC Tiệc Cưới");
        var lesson = CreateLesson(58, course.CourseId, title: "Buổi 2: Kỹ năng");

        var dto = new CreateCommentDto
        {
            Content = "Chào các bạn, đây là lưu ý của bài học."
        };

        // Act
        await Service.CreateLessonCommentAsync(lesson.LessonId, instructor.UserId, dto);

        // Assert
        var notifications = await DbContext.Notifications.Where(n => n.UserId == instructor.UserId).ToListAsync();
        notifications.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateLessonCommentAsync_WhenInstructorRepliesToStudent_NotifiesStudentWithLessonUrl()
    {
        // Arrange
        var instructor = CreateUser(1, "Instructor John", "instructor@example.com", roleName: "Instructor");
        var student = CreateUser(2, "Student Alice", "alice@example.com", roleName: "Learner");
        var course = CreateCourse(10, instructor.UserId, title: "MC Tiệc Cưới");
        var lesson = CreateLesson(58, course.CourseId, title: "Buổi 2");

        var studentComment = CreateComment(100, postId: null, authorId: student.UserId, lessonId: lesson.LessonId, depthLevel: 1);

        // Clear any notifications created by seeding studentComment
        DbContext.Notifications.RemoveRange(DbContext.Notifications);
        await DbContext.SaveChangesAsync();

        var dto = new CreateCommentDto
        {
            ParentCommentId = studentComment.CommentId,
            Content = "Đây em nhé!"
        };

        // Act
        await Service.CreateLessonCommentAsync(lesson.LessonId, instructor.UserId, dto);

        // Assert
        var instructorNotices = await DbContext.Notifications.Where(n => n.UserId == instructor.UserId).ToListAsync();
        instructorNotices.Should().BeEmpty();

        var studentNotice = await DbContext.Notifications.FirstOrDefaultAsync(n => n.UserId == student.UserId);
        studentNotice.Should().NotBeNull();
        studentNotice!.Url.Should().Be("/courses/10/learn?lessonId=58");
        studentNotice.Message.Should().Contain("Giảng viên");
    }
}
