using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;

namespace MC_BE.Features.Forum.Services.Interfaces;

public interface IAdminForumService
{
    Task<PaginatedResult<ForumReportDto>> GetReportsAsync(int page, int limit, string? status, string? targetType);
    Task<PaginatedResult<ForumPostDto>> GetAdminPostsAsync(int page, int limit, int? topicId, string? status, string? search);
    Task<bool> ResolveReportAsync(int reportId, int adminId, string action); // action: DISMISS, HIDE, DELETE
    Task<bool> RestorePostAsync(int postId, int adminId);
    Task<bool> UpdatePostStatusAsync(int postId, int adminId, string status);
    Task<bool> RestoreCommentAsync(int commentId, int adminId);
    Task<bool> UpdateCommentStatusAsync(int commentId, int adminId, string status);
    Task<ForumTopicDto> CreateTopicAsync(CreateForumTopicDto request);
    Task<ForumTopicDto?> UpdateTopicAsync(int topicId, CreateForumTopicDto request);
    Task<bool> DeleteTopicAsync(int topicId);
}
