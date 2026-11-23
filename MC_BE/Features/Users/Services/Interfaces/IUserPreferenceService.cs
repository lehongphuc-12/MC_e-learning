using System.Threading.Tasks;
using MC_BE.Features.Users.DTOs;

namespace MC_BE.Features.Users.Services.Interfaces;

public interface IUserPreferenceService
{
    Task<UserPreferenceDto> GetUserPreferenceAsync(int userId);
    Task<UserPreferenceDto> SaveUserPreferenceAsync(int userId, SaveUserPreferenceRequest request);
}
