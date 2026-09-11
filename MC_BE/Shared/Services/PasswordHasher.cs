using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Features.Auth.Services.Interfaces;
using MC_BE.Features.Admin.Services.Interfaces;
using MC_BE.Features.Users.Services.Interfaces;
using BCrypt.Net;

namespace MC_BE.Shared.Services;

public class PasswordHasher : IPasswordHasher
{
    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        return BCrypt.Net.BCrypt.Verify(password, passwordHash);
    }
}
