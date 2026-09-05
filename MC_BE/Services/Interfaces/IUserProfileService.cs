using MC_BE.DTOs;
using MC_BE.DTOs.auth;

namespace MC_BE.Services.Interfaces;

public interface IUserProfileService
{
    Task<ApiResponse<UserProfileDto>> GetProfileAsync(GetProfileRequestDto request, int currentUserId);
    Task<ApiResponse<UserProfileDto>> UpdateProfileAsync(int userId, UpdateProfileRequestDto request);
    Task<ApiResponse<UserProfileDto>> UpdateAvatarAsync(int userId, UpdateAvatarRequestDto request);
}
