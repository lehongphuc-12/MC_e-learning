using Microsoft.AspNetCore.Http;
using MC_BE.Models.Entities;

namespace MC_BE.Services.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) GenerateJwtToken(User user);
    RefreshToken GenerateRefreshToken(int userId);
    void SetRefreshTokenCookie(HttpResponse response, string refreshToken, DateTime expiresAt);
    void ClearRefreshTokenCookie(HttpResponse response);
}
