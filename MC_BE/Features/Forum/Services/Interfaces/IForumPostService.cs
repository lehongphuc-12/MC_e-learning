using System.Threading.Tasks;
using MC_BE.Core.DTOs;
using MC_BE.Features.Forum.DTOs;

namespace MC_BE.Features.Forum.Services.Interfaces;

public interface IForumPostService
{
    Task<List<ForumTopicDto>> GetTopicsAsync();
    Task<PaginatedResult<ForumPostDto>> GetPostsAsync(PostQueryParameters query, int? currentUserId, bool isAdmin);
    Task<ForumPostDto?> GetPostByIdAsync(int postId, int? currentUserId, bool isAdmin);
    Task<ForumPostDto> CreatePostAsync(int authorId, CreatePostRequest request);
    Task<ForumPostDto?> UpdatePostAsync(int postId, int userId, UpdatePostRequest request);
    Task<bool> DeletePostAsync(int postId, int userId, bool isAdmin);
}
