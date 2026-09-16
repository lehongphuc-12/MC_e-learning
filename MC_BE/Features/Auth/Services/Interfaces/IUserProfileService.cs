using MC_BE.Core.DTOs;
using MC_BE.Features.Auth.DTOs.auth;

namespace MC_BE.Features.Auth.Services.Interfaces;

public interface IUserProfileService
{
    Task<ApiResponse<UserProfileDto>> GetProfileAsync(GetProfileRequestDto request, int currentUserId);
    Task<ApiResponse<UserProfileDto>> UpdateProfileAsync(int userId, UpdateProfileRequestDto request);
    Task<ApiResponse<UserProfileDto>> UpdateAvatarAsync(int userId, UpdateAvatarRequestDto request);
}
