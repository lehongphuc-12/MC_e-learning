using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using MC_BE.Core.Entities;
using MC_BE.Features.Users.DTOs;
using MC_BE.Features.Users.Services;
using MC_BE.Shared.Data;

namespace MC_BE.Tests.Features.Users;

public class UserPreferenceServiceTests
{
    private readonly SmartMcDbContext _context;
    private readonly UserPreferenceService _service;

    public UserPreferenceServiceTests()
    {
        var options = new DbContextOptionsBuilder<SmartMcDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new SmartMcDbContext(options);
        _service = new UserPreferenceService(_context);
    }

    [Fact]
    public async Task GetUserPreferenceAsync_WhenNoPreferenceExists_ReturnsDefaultIncompleteDto()
    {
        // Act
        var result = await _service.GetUserPreferenceAsync(999);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(999, result.UserId);
        Assert.False(result.IsCompleted);
        Assert.Empty(result.TargetCategories);
        Assert.Empty(result.FocusSkills);
    }

    [Fact]
    public async Task SaveUserPreferenceAsync_CreatesAndCompletesPreference()
    {
        // Arrange
        var request = new SaveUserPreferenceRequest
        {
            TargetCategories = new List<string> { "MC Sự Kiện - Hội Nghị", "MC Tiệc Cưới" },
            ExperienceLevel = "Beginner",
            FocusSkills = new List<string> { "Pronunciation", "SpeechRate", "Intonation" }
        };

        // Act
        var result = await _service.SaveUserPreferenceAsync(101, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(101, result.UserId);
        Assert.True(result.IsCompleted);
        Assert.Equal(2, result.TargetCategories.Count);
        Assert.Equal("Beginner", result.ExperienceLevel);
        Assert.Equal(3, result.FocusSkills.Count);

        // Verify in DB
        var inDb = await _context.UserLearningPreferences.FirstOrDefaultAsync(p => p.UserId == 101);
        Assert.NotNull(inDb);
        Assert.True(inDb.IsCompleted);
        Assert.Equal("MC Sự Kiện - Hội Nghị,MC Tiệc Cưới", inDb.TargetCategories);
        Assert.Equal("Pronunciation,SpeechRate,Intonation", inDb.FocusSkills);
    }
}
