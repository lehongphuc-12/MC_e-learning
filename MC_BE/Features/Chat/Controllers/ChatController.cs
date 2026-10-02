using System.Security.Claims;
using MC_BE.Features.Chat.DTOs;
using MC_BE.Features.Chat.Hubs;
using MC_BE.Features.Chat.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace MC_BE.Features.Chat.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly IHubContext<ChatHub> _hub;

    public ChatController(
        IChatService chatService,
        IHubContext<ChatHub> hub)
    {
        _chatService = chatService;
        _hub = hub;
    }

    // ============================================================
    // SEARCH USERS
    // ============================================================

    [HttpGet("users/search")]
    public async Task<ActionResult<List<ChatUserDto>>> SearchUsers(
        [FromQuery] string? keyword)
    {
        if (string.IsNullOrWhiteSpace(keyword))
            return Ok(new List<ChatUserDto>());

        var result = await _chatService.SearchUsersAsync(
            GetCurrentUserId(),
            keyword);

        return Ok(result);
    }

    // ============================================================
    // CREATE OR GET CONVERSATION
    // ============================================================

    [HttpPost("conversations")]
    public async Task<ActionResult<ConversationDto>> CreateConversation(
        [FromBody] CreateConversationRequest request)
    {
        var result = await _chatService.CreateOrGetConversationAsync(
            GetCurrentUserId(),
            request.OtherUserId);

        return Ok(result);
    }

    // ============================================================
    // GET CONVERSATIONS
    // ============================================================

    [HttpGet("conversations")]
    public async Task<ActionResult<List<ConversationDto>>> GetConversations()
    {
        var result = await _chatService.GetConversationsAsync(
            GetCurrentUserId());

        return Ok(result);
    }

    // ============================================================
    // GET CHAT USER PROFILE
    // ============================================================

    [HttpGet("conversations/{conversationId:int}/profile")]
    public async Task<ActionResult<ChatUserProfileDto>> GetUserProfile(
        int conversationId)
    {
        var result = await _chatService.GetUserProfileAsync(
            GetCurrentUserId(),
            conversationId);

        return Ok(result);
    }

    // ============================================================
    // GET MESSAGES
    // ============================================================

    [HttpGet("conversations/{conversationId:int}/messages")]
    public async Task<ActionResult<ChatPagedResult<ChatMessageDto>>> GetMessages(
        int conversationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30)
    {
        var result = await _chatService.GetMessagesAsync(
            GetCurrentUserId(),
            conversationId,
            page,
            pageSize);

        return Ok(result);
    }

    // ============================================================
    // SEND TEXT
    // ============================================================

    [HttpPost("messages/text")]
    public async Task<ActionResult<ChatMessageDto>> SendText(
        [FromBody] SendTextMessageRequest request)
    {
        var result = await _chatService.SendTextAsync(
            GetCurrentUserId(),
            request);

        await BroadcastNewMessage(result);

        return Ok(result);
    }

    // ============================================================
    // SEND STICKER
    // ============================================================

    [HttpPost("messages/sticker")]
    public async Task<ActionResult<ChatMessageDto>> SendSticker(
        [FromBody] SendStickerRequest request)
    {
        var result = await _chatService.SendStickerAsync(
            GetCurrentUserId(),
            request);

        await BroadcastNewMessage(result);

        return Ok(result);
    }

    // ============================================================
    // SEND FILE
    // ============================================================

    [HttpPost("messages/file")]
    [RequestSizeLimit(30 * 1024 * 1024)]
    public async Task<ActionResult<ChatMessageDto>> SendFile(
        [FromForm] SendAttachmentRequest request)
    {
        var result = await _chatService.SendFileAsync(
            GetCurrentUserId(),
            request.ConversationId,
            request.File,
            request.ReplyToMessageId);

        await BroadcastNewMessage(result);

        return Ok(result);
    }

    // ============================================================
    // SEND VOICE
    // ============================================================

    [HttpPost("messages/voice")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<ChatMessageDto>> SendVoice(
        [FromForm] SendVoiceMessageRequest request)
    {
        var result = await _chatService.SendVoiceAsync(
            GetCurrentUserId(),
            request.ConversationId,
            request.Audio,
            request.DurationSeconds,
            request.ReplyToMessageId);

        await BroadcastNewMessage(result);

        return Ok(result);
    }

    // ============================================================
    // FORWARD MESSAGE
    // ============================================================

    [HttpPost("messages/{messageId:long}/forward")]
    public async Task<ActionResult<List<ChatMessageDto>>> ForwardMessage(
        long messageId,
        [FromBody] ForwardMessageRequest request)
    {
        var messages = await _chatService.ForwardMessageAsync(
            GetCurrentUserId(),
            messageId,
            request);

        foreach (var message in messages)
            await BroadcastNewMessage(message);

        return Ok(messages);
    }

    // ============================================================
    // RECALL
    // ============================================================

    [HttpPost("messages/{messageId:long}/recall")]
    public async Task<ActionResult<ChatMessageDto>> Recall(long messageId)
    {
        var result = await _chatService.RecallMessageAsync(
            GetCurrentUserId(),
            messageId);

        await _hub.Clients
            .Group(ChatHub.ConversationGroup(result.ConversationId))
            .SendAsync("MessageRecalled", result);

        return Ok(result);
    }

    // ============================================================
    // REACTION
    // ============================================================

    [HttpPost("messages/{messageId:long}/reaction")]
    public async Task<ActionResult<ChatMessageDto>> React(
        long messageId,
        [FromBody] ReactMessageRequest request)
    {
        var result = await _chatService.ReactAsync(
            GetCurrentUserId(),
            messageId,
            request.Reaction);

        await _hub.Clients
            .Group(ChatHub.ConversationGroup(result.ConversationId))
            .SendAsync("MessageReactionChanged", result);

        return Ok(result);
    }

    // ============================================================
    // MARK READ
    // ============================================================

    [HttpPost("conversations/{conversationId:int}/read/{messageId:long}")]
    public async Task<IActionResult> MarkRead(
        int conversationId,
        long messageId)
    {
        var userId = GetCurrentUserId();

        await _chatService.MarkReadAsync(
            userId,
            conversationId,
            messageId);

        await _hub.Clients
            .Group(ChatHub.ConversationGroup(conversationId))
            .SendAsync("MessagesRead", new
            {
                conversationId,
                userId,
                messageId
            });

        return NoContent();
    }

    // ============================================================
    // STICKERS
    // ============================================================

    [HttpGet("stickers")]
    public async Task<ActionResult<List<StickerPackDto>>> GetStickers()
    {
        var result = await _chatService.GetStickerPacksAsync();
        return Ok(result);
    }

    // ============================================================
    // BROADCAST
    // ============================================================

    private async Task BroadcastNewMessage(ChatMessageDto message)
    {
        await _hub.Clients
            .Group(ChatHub.ConversationGroup(message.ConversationId))
            .SendAsync("ReceiveMessage", message);

        var receiverId = await _chatService.GetOtherUserIdAsync(
            GetCurrentUserId(),
            message.ConversationId);

        await _hub.Clients
            .Group(ChatHub.UserGroup(receiverId))
            .SendAsync("ConversationUpdated", message);
    }

    // ============================================================
    // CURRENT USER
    // ============================================================

    private int GetCurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(raw, out var userId))
            throw new UnauthorizedAccessException(
                "Không xác định được người dùng.");

        return userId;
    }
}