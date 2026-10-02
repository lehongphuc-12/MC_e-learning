using MC_BE.Features.Chat.DTOs;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Chat.Services.Interfaces;

public interface IChatService
{
    Task<List<ChatUserDto>> SearchUsersAsync(
        int currentUserId,
        string keyword);

    Task<ConversationDto> CreateOrGetConversationAsync(
        int currentUserId,
        int otherUserId);

    Task<List<ConversationDto>> GetConversationsAsync(
        int currentUserId);

    Task<ChatUserProfileDto> GetUserProfileAsync(
        int currentUserId,
        int conversationId);

    Task<ChatPagedResult<ChatMessageDto>> GetMessagesAsync(
        int currentUserId,
        int conversationId,
        int page,
        int pageSize);

    Task<ChatMessageDto> SendTextAsync(
        int currentUserId,
        SendTextMessageRequest request);

    Task<ChatMessageDto> SendStickerAsync(
        int currentUserId,
        SendStickerRequest request);

    Task<ChatMessageDto> SendFileAsync(
        int currentUserId,
        int conversationId,
        IFormFile file,
        long? replyToMessageId);

    Task<ChatMessageDto> SendVoiceAsync(
        int currentUserId,
        int conversationId,
        IFormFile audio,
        int durationSeconds,
        long? replyToMessageId);

    Task<List<ChatMessageDto>> ForwardMessageAsync(
        int currentUserId,
        long messageId,
        ForwardMessageRequest request);

    Task<ChatMessageDto> RecallMessageAsync(
        int currentUserId,
        long messageId);

    Task<ChatMessageDto> ReactAsync(
        int currentUserId,
        long messageId,
        string reaction);

    Task MarkReadAsync(
        int currentUserId,
        int conversationId,
        long messageId);

    Task<List<StickerPackDto>> GetStickerPacksAsync();

    Task<int> GetOtherUserIdAsync(
        int currentUserId,
        int conversationId);

    Task EnsureConversationMemberAsync(
        int currentUserId,
        int conversationId);
}