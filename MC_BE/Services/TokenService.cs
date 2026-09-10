using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MC_BE.Models.Entities;
using MC_BE.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace MC_BE.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public (string Token, DateTime ExpiresAt) GenerateJwtToken(User user)
    {
        var secretKey = _config["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured.");
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];
        var expiryInMinutes = double.Parse(_config["Jwt:ExpiryInMinutes"] ?? "15");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role?.RoleName ?? "Learner"),
            new Claim("status", user.Status)
        };

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryInMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAt,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = creds
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return (tokenHandler.WriteToken(token), expiresAt);
    }

    public RefreshToken GenerateRefreshToken(int userId)
    {
        var randomBytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(64);
        var tokenString = Convert.ToBase64String(randomBytes);
        var expiryInDays = double.Parse(_config["Jwt:RefreshTokenExpiryInDays"] ?? "7");

        return new RefreshToken
        {
            UserId = userId,
            Token = tokenString,
            ExpiresAt = DateTime.UtcNow.AddDays(expiryInDays),
            CreatedAt = DateTime.UtcNow
        };
    }

    public void SetRefreshTokenCookie(HttpResponse response, string refreshToken, DateTime expiresAt)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = expiresAt,
            Path = "/"
        };
        response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    public void ClearRefreshTokenCookie(HttpResponse response)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTime.UtcNow.AddDays(-1),
            Path = "/"
        };
        response.Cookies.Append("refreshToken", "", cookieOptions);
    }
}
