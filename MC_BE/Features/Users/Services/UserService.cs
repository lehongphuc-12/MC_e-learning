using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Features.Admin.DTOs;
using MC_BE.Features.Users.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Users.Services;

public class UserService : IUserService
{
    private readonly IGenericRepository<User> _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UserService(IGenericRepository<User> userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<List<AdminUserDto>>> GetAllUsersForAdminAsync()
    {
        var users = await _userRepository.FindAsync(_ => true, u => u.Role);

        var userDtos = users.Select(u => new AdminUserDto
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

        return ApiResponse<List<AdminUserDto>>.SuccessResponse(userDtos, "Retrieved user list successfully.");
    }

    public async Task<ApiResponse<object>> UpdateUserStatusAsync(int userId, string targetStatus)
    {
        var normalizedStatus = targetStatus.ToUpper();
        if (normalizedStatus != "ACTIVE" && normalizedStatus != "INACTIVE")
            return ApiResponse<object>.FailureResponse("Invalid status. Allowed values: ACTIVE, INACTIVE.");

        var users = await _userRepository.FindAsync(u => u.UserId == userId);
        var user = users.FirstOrDefault();

        if (user == null)
            return ApiResponse<object>.FailureResponse("User not found.");

        if (user.Status.Equals(normalizedStatus, StringComparison.OrdinalIgnoreCase))
            return ApiResponse<object>.FailureResponse($"User is already {normalizedStatus.ToLower()}.");

        user.Status = normalizedStatus;
        user.UpdatedAt = DateTime.UtcNow;

        _userRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        var action = normalizedStatus == "ACTIVE" ? "activated" : "deactivated";
        return ApiResponse<object>.SuccessResponse(null, $"User '{user.FullName}' has been {action} successfully.");
    }
}
