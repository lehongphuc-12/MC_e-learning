using MC_BE.Core.DTOs;
using MC_BE.Core.Entities;
using MC_BE.Features.Admin.DTOs;
using MC_BE.Features.Users.Services.Interfaces;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Users.Services;

public class UserService : IUserService
{
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<Role> _roleRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UserService(
        IGenericRepository<User> userRepository,
        IGenericRepository<Role> roleRepository,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
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
            Status = u.Status.ToLower() == "active" ? "active" : "locked",
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

    public async Task<ApiResponse<AdminUserDto>> AdminUpdateUserAsync(int userId, AdminUpdateUserRequest request)
    {
        var users = await _userRepository.FindAsync(u => u.UserId == userId, u => u.Role);
        var user = users.FirstOrDefault();

        if (user == null)
            return ApiResponse<AdminUserDto>.FailureResponse("User not found.");

        if (!string.IsNullOrWhiteSpace(request.Email) && !request.Email.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var existingWithEmail = await _userRepository.FindAsync(u => u.Email.ToLower() == request.Email.Trim().ToLower() && u.UserId != userId);
            if (existingWithEmail.Any())
            {
                return ApiResponse<AdminUserDto>.FailureResponse("Email is already used by another user.");
            }
            user.Email = request.Email.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            user.FullName = request.Name.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var statusStr = request.Status.Trim().ToLower();
            user.Status = (statusStr == "active" || statusStr == "active") ? "ACTIVE" : "INACTIVE";
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var targetRoleName = request.Role.Trim().ToLower() switch
            {
                "student" => "Learner",
                "instructor" => "Instructor",
                "admin" => "Admin",
                _ => request.Role.Trim()
            };

            var rolesFound = await _roleRepository.FindAsync(r => r.RoleName.ToLower() == targetRoleName.ToLower());
            var matchedRole = rolesFound.FirstOrDefault();
            if (matchedRole != null)
            {
                user.RoleId = matchedRole.RoleId;
                user.Role = matchedRole;
            }
        }

        user.UpdatedAt = DateTime.UtcNow;
        _userRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        var updatedDto = new AdminUserDto
        {
            Id = user.UserId.ToString(),
            Name = user.FullName,
            Email = user.Email,
            Role = (user.Role?.RoleName ?? "Learner").ToLower() switch
            {
                "learner" => "student",
                "admin" => "admin",
                "instructor" => "instructor",
                _ => "student"
            },
            Status = user.Status.ToLower() == "active" ? "active" : "locked",
            Avatar = user.AvatarUrl,
            JoinedDate = user.CreatedAt.ToString("yyyy-MM-dd"),
            LastActive = user.LastLoginAt.HasValue ? user.LastLoginAt.Value.ToString("yyyy-MM-dd HH:mm") : "N/A"
        };

        return ApiResponse<AdminUserDto>.SuccessResponse(updatedDto, "User updated successfully.");
    }
}

