using MC_BE.Core.Entities;
using Microsoft.AspNetCore.Http;
using MC_BE.Core.Entities;

namespace MC_BE.Shared.Services.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) GenerateJwtToken(User user);
    RefreshToken GenerateRefreshToken(int userId);
    void SetRefreshTokenCookie(HttpResponse response, string refreshToken, DateTime expiresAt);
    void ClearRefreshTokenCookie(HttpResponse response);
}
