using MC_BE.DTOs;
using MC_BE.DTOs.auth;

namespace MC_BE.Services.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequest request);
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<LoginResponse>> GoogleLoginAsync(GoogleLoginRequest request);
    Task<ApiResponse<UserDto>> GetMeAsync(int userId);
    Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordRequestDto request);
    Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordRequestDto request);
    Task<ApiResponse<string>> ChangePasswordAsync(int userId, ChangePasswordRequestDto request);
}
