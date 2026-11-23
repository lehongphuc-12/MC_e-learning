using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MC_BE.Core.Entities;
using MC_BE.Features.Users.DTOs;
using MC_BE.Features.Users.Services.Interfaces;
using MC_BE.Shared.Data;

namespace MC_BE.Features.Users.Services;

public class UserPreferenceService : IUserPreferenceService
{
    private readonly SmartMcDbContext _context;

    public UserPreferenceService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<UserPreferenceDto> GetUserPreferenceAsync(int userId)
    {
        var pref = await _context.UserLearningPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (pref == null)
        {
            return new UserPreferenceDto
            {
                UserId = userId,
                IsCompleted = false,
                TargetCategories = new(),
                FocusSkills = new(),
                ExperienceLevel = null,
                UpdatedAt = DateTime.UtcNow
            };
        }

        return MapToDto(pref);
    }

    public async Task<UserPreferenceDto> SaveUserPreferenceAsync(int userId, SaveUserPreferenceRequest request)
    {
        var pref = await _context.UserLearningPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        var targetCategoriesStr = request.TargetCategories != null
            ? string.Join(",", request.TargetCategories.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()))
            : null;

        var focusSkillsStr = request.FocusSkills != null
            ? string.Join(",", request.FocusSkills.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()))
            : null;

        var experienceLevelStr = request.ExperienceLevel?.Trim();

        if (pref == null)
        {
            pref = new UserLearningPreferences
            {
                UserId = userId,
                TargetCategories = targetCategoriesStr,
                ExperienceLevel = experienceLevelStr,
                FocusSkills = focusSkillsStr,
                IsCompleted = true,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserLearningPreferences.Add(pref);
        }
        else
        {
            pref.TargetCategories = targetCategoriesStr;
            pref.ExperienceLevel = experienceLevelStr;
            pref.FocusSkills = focusSkillsStr;
            pref.IsCompleted = true;
            pref.UpdatedAt = DateTime.UtcNow;
            _context.UserLearningPreferences.Update(pref);
        }

        await _context.SaveChangesAsync();
        return MapToDto(pref);
    }

    private static UserPreferenceDto MapToDto(UserLearningPreferences pref)
    {
        var categories = !string.IsNullOrWhiteSpace(pref.TargetCategories)
            ? pref.TargetCategories.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : new();

        var skills = !string.IsNullOrWhiteSpace(pref.FocusSkills)
            ? pref.FocusSkills.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : new();

        return new UserPreferenceDto
        {
            Id = pref.Id,
            UserId = pref.UserId,
            TargetCategories = categories,
            ExperienceLevel = pref.ExperienceLevel,
            FocusSkills = skills,
            IsCompleted = pref.IsCompleted,
            UpdatedAt = pref.UpdatedAt
        };
    }
}
