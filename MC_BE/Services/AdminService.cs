using MC_BE.DTOs;
using MC_BE.Models.Entities;
using MC_BE.Repositories;
using MC_BE.Services.Interfaces;

namespace MC_BE.Services;

public class AdminService : IAdminService
{
    private readonly IGenericRepository<User> _userRepository;

    public AdminService(IGenericRepository<User> userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<ApiResponse<List<AdminUserDto>>> GetUsersAsync()
    {
        var users = await _userRepository.FindAsync(_ => true, u => u.Role);

        var adminUserDtos = users.Select(u => new AdminUserDto
        {
            Id = u.UserId.ToString(),
            Name = u.FullName,
            Email = u.Email,
            Role = (u.Role?.RoleName ?? "Learner").ToLower() switch
            {
                "learner" => "student",
                "admin" => "admin",
                "instructor" => "instructor",
                _ => "student"
            },
            Status = u.Status.ToLower(),
            Avatar = u.AvatarUrl,
            JoinedDate = u.CreatedAt.ToString("yyyy-MM-dd"),
            LastActive = u.LastLoginAt.HasValue ? u.LastLoginAt.Value.ToString("yyyy-MM-dd HH:mm") : "N/A"
        }).ToList();

        return ApiResponse<List<AdminUserDto>>.SuccessResponse(adminUserDtos, "Retrieved user list successfully.");
    }
}
