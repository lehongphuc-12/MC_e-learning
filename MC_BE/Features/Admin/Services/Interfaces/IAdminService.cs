using MC_BE.Core.DTOs;
using MC_BE.Features.Admin.DTOs;

namespace MC_BE.Features.Admin.Services.Interfaces;

public interface IAdminService
{
    Task<ApiResponse<List<AdminUserDto>>> GetUsersAsync();
}
