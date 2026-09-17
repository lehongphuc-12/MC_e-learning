using System;
using System.Security.Claims;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Shared.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string GetUserId()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                     ?? user?.FindFirst("sub")?.Value 
                     ?? user?.FindFirst("id")?.Value;

        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new UnauthorizedAccessException("User is not authenticated.");
        }

        return userId;
    }

    public string? GetUserEmail()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Email)?.Value;
    }

    public string? GetUserRole()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
    }

    public bool IsInRole(string role)
    {
        return _httpContextAccessor.HttpContext?.User?.IsInRole(role) ?? false;
    }

    public void RequireAdmin()
    {
        if (!IsInRole("Admin"))
        {
            throw new UnauthorizedAccessException("Forbidden: Admin role required.");
        }
    }

    public void RequireLearner()
    {
        if (!IsInRole("Learner") && !IsInRole("Admin"))
        {
            throw new UnauthorizedAccessException("Forbidden: Learner role required.");
        }
    }

    public void RequireInstructor()
    {
        if (!IsInRole("Instructor") && !IsInRole("Admin"))
        {
            throw new UnauthorizedAccessException("Forbidden: Instructor role required.");
        }
    }
}