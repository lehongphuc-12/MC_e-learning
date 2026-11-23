using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.Services;
using MC_BE.Shared.Data;

namespace MC_BE.Tests.Features.Courses;

public class CourseRecommendationServiceTests
{
    private readonly SmartMcDbContext _context;
    private readonly CourseRecommendationService _service;

    public CourseRecommendationServiceTests()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new SmartMcDbContext(options);
        var loggerMock = new Mock<ILogger<CourseRecommendationService>>();
        _service = new CourseRecommendationService(_context, loggerMock.Object);
    }

    [Fact]
    public async Task GetTopRecommendationsAsync_ColdStart_ReturnsDefaultReason_AndBasicInfo()
    {
        // Arrange: User mới chưa có bất kỳ bài tập, enrollment hay survey nào
        int userId = 100;

        var instructor = new User
        {
            UserId = 1,
            FullName = "HLV Trần MC",
            Email = "tranmc@test.com",
            Status = "ACTIVE",
            RoleId = 2
        };
        _context.Users.Add(instructor);

        var cat = new Category { CategoryId = 1, CategoryName = "MC Tiệc Cưới" };
        _context.Categories.Add(cat);

        var course = new Course
        {
            CourseId = 1,
            CategoryId = 1,
            Category = cat,
            InstructorId = 1,
            Instructor = instructor,
            Title = "MC Tiệc Cưới Cơ Bản",
            Slug = "mc-tiec-cuoi-co-ban",
            Level = CourseLevel.BEGINNER,
            Status = CourseStatus.PUBLISHED,
            Price = 500000m,
            SkillTags = "Pronunciation,SpeechRate"
        };
        _context.Courses.Add(course);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTopRecommendationsAsync(userId, top: 3);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);

        var item = result.First();
        Assert.Equal(1, item.Id);
        Assert.Equal(1, item.CourseId);
        Assert.Equal("MC Tiệc Cưới Cơ Bản", item.Title);
        Assert.Equal("MC Tiệc Cưới", item.CategoryName);
        Assert.Equal("HLV Trần MC", item.InstructorName);
        Assert.Equal("BEGINNER", item.Level);
        Assert.Equal(500000m, item.Price);
        Assert.True(item.OriginalPrice > item.Price);
        Assert.Equal(20, item.DiscountPercent);
        Assert.True(item.Rating >= 4.5);
        Assert.True(item.ReviewCount >= 1);
        Assert.False(string.IsNullOrWhiteSpace(item.Duration));
        Assert.True(item.TotalScore >= 0.0 && item.TotalScore <= 1.0);
    }

    [Fact]
    public async Task GetRecommendations_NextStepScore_TakesHighestPriorityReason()
    {
        // Arrange
        int userId = 200;

        var instructor = new User
        {
            UserId = 2,
            FullName = "HLV Minh",
            Email = "minh@test.com",
            Status = "ACTIVE",
            RoleId = 2
        };
        _context.Users.Add(instructor);

        var cat = new Category { CategoryId = 2, CategoryName = "MC Sự Kiện" };
        _context.Categories.Add(cat);

        // Khóa học tiên quyết đã hoàn thành
        var prereqCourse = new Course
        {
            CourseId = 201,
            CategoryId = 2,
            Category = cat,
            InstructorId = 2,
            Instructor = instructor,
            Title = "MC Sự Kiện Nhập Môn",
            Slug = "mc-su-kien-nhap-mon",
            Level = CourseLevel.BEGINNER,
            Status = CourseStatus.PUBLISHED
        };
        _context.Courses.Add(prereqCourse);

        // Đánh dấu hoàn thành khóa học tiên quyết (CompletionPercentage = 100%)
        _context.Enrollments.Add(new Enrollment
        {
            LearnerId = userId,
            CourseId = 201,
            Status = "COMPLETED",
            CompletionPercentage = 100m
        });

        // Khóa học kế tiếp (có PrerequisiteCourseId trỏ tới 201)
        var nextCourse = new Course
        {
            CourseId = 202,
            CategoryId = 2,
            Category = cat,
            InstructorId = 2,
            Instructor = instructor,
            Title = "MC Sự Kiện Nâng Cao",
            Slug = "mc-su-kien-nang-cao",
            Level = CourseLevel.ADVANCED,
            PrerequisiteCourseId = 201,
            PrerequisiteCourse = prereqCourse,
            Status = CourseStatus.PUBLISHED
        };
        _context.Courses.Add(nextCourse);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTopRecommendationsAsync(userId, top: 3);

        // Assert
        Assert.NotNull(result);
        var target = result.FirstOrDefault(c => c.CourseId == 202);
        Assert.NotNull(target);
        Assert.Equal(1.0, target.NextStepScore);
        Assert.Equal("Bước tiếp theo sau khóa MC Sự Kiện Nhập Môn", target.RecommendationReason);
    }

    [Fact]
    public async Task GetRecommendations_SkillGap_FromRubricLowScore_AssignsCorrectReason()
    {
        // Arrange
        int userId = 300;

        var instructor = new User
        {
            UserId = 3,
            FullName = "HLV Hương",
            Email = "huong@test.com",
            Status = "ACTIVE",
            RoleId = 2
        };
        _context.Users.Add(instructor);

        var cat = new Category { CategoryId = 3, CategoryName = "MC Truyền Hình" };
        _context.Categories.Add(cat);

        // User có bài tập Speaking bị điểm kém về Phát âm
        _context.SpeakingSubmissions.Add(new SpeakingSubmission
        {
            LearnerId = userId,
            Score = 40m, // Điểm kém
            AudioUrl = "http://audio.test/sub.mp3",
            Feedback = "Học viên bị ngọng phát âm và nuốt chữ nhiều <!--RUBRIC_SCORES:[{\"Code\":\"C01\",\"Name\":\"Phát âm & thanh điệu\",\"Score\":2.0}]-->"
        });

        // Khóa học chuyên về Phát âm
        var pronCourse = new Course
        {
            CourseId = 301,
            CategoryId = 3,
            Category = cat,
            InstructorId = 3,
            Instructor = instructor,
            Title = "Luyện Giọng & Chuẩn Hóa Phát Âm MC",
            Slug = "luyen-giong-phat-am-mc",
            Level = CourseLevel.BEGINNER,
            Status = CourseStatus.PUBLISHED,
            SkillTags = "Pronunciation,VoiceClarity"
        };
        _context.Courses.Add(pronCourse);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTopRecommendationsAsync(userId, top: 3);

        // Assert
        Assert.NotNull(result);
        var course = result.FirstOrDefault(c => c.CourseId == 301);
        Assert.NotNull(course);
        Assert.True(course.SkillGapScore >= 0.5);
        Assert.Contains("Giúp cải thiện kỹ năng", course.RecommendationReason);
    }
}
