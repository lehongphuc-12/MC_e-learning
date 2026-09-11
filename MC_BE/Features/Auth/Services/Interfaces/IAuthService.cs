using MC_BE.Core.DTOs;
using MC_BE.Features.Auth.DTOs;
using MC_BE.Features.Auth.DTOs.auth;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Auth.Services.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequest request);
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request, HttpResponse httpResponse);
    Task<ApiResponse<LoginResponse>> GoogleLoginAsync(GoogleLoginRequest request, HttpResponse httpResponse);
    Task<ApiResponse<RefreshTokenResponseDto>> RefreshTokenAsync(string? requestRefreshToken, HttpRequest httpRequest, HttpResponse httpResponse);
    Task<ApiResponse<string>> LogoutAsync(string? requestRefreshToken, HttpRequest httpRequest, HttpResponse httpResponse);
    Task<ApiResponse<UserDto>> GetMeAsync(int userId);
    Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordRequestDto request);
    Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordRequestDto request);
    Task<ApiResponse<string>> ChangePasswordAsync(int userId, ChangePasswordRequestDto request);
}
