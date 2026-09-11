using MC_BE.Core.DTOs;
using MC_BE.Features.Admin.DTOs;

namespace MC_BE.Features.Users.Services.Interfaces;

public interface IUserService
{
    Task<ApiResponse<List<AdminUserDto>>> GetAllUsersForAdminAsync();
}
