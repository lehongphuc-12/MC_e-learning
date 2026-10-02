using System.Collections.Generic;
using System.Threading.Tasks;
using MC_BE.Features.Forum.DTOs;

namespace MC_BE.Features.Forum.Services.Interfaces;

public interface IForumCommentService
{
    Task<List<ForumCommentDto>> GetCommentsByPostIdAsync(int postId, int? currentUserId, bool isAdmin);
    Task<ForumCommentDto> AddCommentAsync(int authorId, CreateCommentRequest request);
    Task<ForumCommentDto?> UpdateCommentAsync(int commentId, int userId, UpdateCommentRequest request);
    Task<bool> DeleteCommentAsync(int commentId, int userId, bool isAdmin);
}
