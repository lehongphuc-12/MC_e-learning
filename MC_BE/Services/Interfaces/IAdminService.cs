using MC_BE.DTOs;

namespace MC_BE.Services.Interfaces;

public interface IAdminService
{
    Task<ApiResponse<List<AdminUserDto>>> GetUsersAsync();
}
