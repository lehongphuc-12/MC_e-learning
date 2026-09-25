using System.Threading.Tasks;
using MC_BE.Features.Forum.DTOs;

namespace MC_BE.Features.Forum.Services.Interfaces;

public interface IForumInteractionService
{
    Task<ForumReactionSummaryDto> ToggleReactionAsync(int userId, ToggleReactionRequest request);
    Task<bool> CreateReportAsync(int reporterId, CreateReportRequest request);
}
