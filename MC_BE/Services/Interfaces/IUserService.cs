using MC_BE.DTOs;

namespace MC_BE.Services.Interfaces;

public interface IUserService
{
    Task<ApiResponse<List<AdminUserDto>>> GetAllUsersForAdminAsync();
}
