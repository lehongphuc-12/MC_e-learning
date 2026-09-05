using MC_BE.Models.Entities;

namespace MC_BE.Services.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) GenerateJwtToken(User user);
}
