using System.Collections.Concurrent;
using System.Security.Claims;
using MC_BE.Features.Chat.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MC_BE.Features.Chat.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;
    private readonly SmartMcDbContext _context;
    private readonly ILogger<ChatHub> _logger;

    private static readonly ConcurrentDictionary<int, ConcurrentDictionary<string, byte>>
        OnlineUsers = new();

    public ChatHub(
        IChatService chatService,
        SmartMcDbContext context,
        ILogger<ChatHub> logger)
    {
        _chatService = chatService;
        _context = context;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            UserGroup(userId)
        );

        var connections = OnlineUsers.GetOrAdd(
            userId,
            _ => new ConcurrentDictionary<string, byte>()
        );

        var wasOffline = connections.IsEmpty;

        connections.TryAdd(
            Context.ConnectionId,
            0
        );

        _logger.LogInformation(
            "Chat connected: UserId={UserId}, ConnectionId={ConnectionId}, Connections={Connections}",
            userId,
            Context.ConnectionId,
            connections.Count
        );

        if (wasOffline)
        {
            await Clients.Others.SendAsync(
                "UserOnline",
                userId
            );
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(
        Exception? exception)
    {
        int? userId = null;

        try
        {
            userId = GetCurrentUserId();

            if (
                OnlineUsers.TryGetValue(
                    userId.Value,
                    out var connections
                )
            )
            {
                connections.TryRemove(
                    Context.ConnectionId,
                    out _
                );

                _logger.LogInformation(
                    "Chat disconnected: UserId={UserId}, ConnectionId={ConnectionId}, RemainingConnections={Connections}",
                    userId.Value,
                    Context.ConnectionId,
                    connections.Count
                );

                if (connections.IsEmpty)
                {
                    OnlineUsers.TryRemove(
                        userId.Value,
                        out _
                    );

                    var lastSeenAt = DateTime.UtcNow;

                    var updatedRows = await _context.Users
                        .Where(x => x.UserId == userId.Value)
                        .ExecuteUpdateAsync(
                            setters => setters.SetProperty(
                                x => x.LastSeenAt,
                                lastSeenAt
                            )
                        );

                    _logger.LogInformation(
                        "LastSeen updated: UserId={UserId}, LastSeenAt={LastSeenAt}, UpdatedRows={UpdatedRows}",
                        userId.Value,
                        lastSeenAt,
                        updatedRows
                    );

                    await Clients.Others.SendAsync(
                        "UserOffline",
                        new
                        {
                            userId = userId.Value,
                            lastSeenAt
                        }
                    );
                }
            }
            else
            {
                _logger.LogWarning(
                    "Disconnected user was not found in OnlineUsers: UserId={UserId}, ConnectionId={ConnectionId}",
                    userId.Value,
                    Context.ConnectionId
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Chat disconnect error: UserId={UserId}, ConnectionId={ConnectionId}",
                userId,
                Context.ConnectionId
            );
        }
        finally
        {
            await base.OnDisconnectedAsync(exception);
        }
    }

    public Task<int[]> GetOnlineUsers()
    {
        var userIds = OnlineUsers
            .Where(x => !x.Value.IsEmpty)
            .Select(x => x.Key)
            .ToArray();

        return Task.FromResult(userIds);
    }

    public async Task JoinConversation(
        int conversationId)
    {
        var userId = GetCurrentUserId();

        await _chatService.EnsureConversationMemberAsync(
            userId,
            conversationId
        );

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            ConversationGroup(conversationId)
        );
    }

    public Task LeaveConversation(
        int conversationId)
    {
        return Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            ConversationGroup(conversationId)
        );
    }

    public async Task Typing(
        int conversationId,
        bool isTyping)
    {
        var userId = GetCurrentUserId();

        await _chatService.EnsureConversationMemberAsync(
            userId,
            conversationId
        );

        await Clients
            .OthersInGroup(
                ConversationGroup(conversationId)
            )
            .SendAsync(
                "UserTyping",
                new
                {
                    conversationId,
                    userId,
                    isTyping
                }
            );
    }

    public async Task MarkRead(
        int conversationId,
        long messageId)
    {
        var userId = GetCurrentUserId();

        await _chatService.MarkReadAsync(
            userId,
            conversationId,
            messageId
        );

        await Clients
            .OthersInGroup(
                ConversationGroup(conversationId)
            )
            .SendAsync(
                "MessagesRead",
                new
                {
                    conversationId,
                    userId,
                    messageId
                }
            );
    }

    private int GetCurrentUserId()
    {
        var raw = Context.User?
            .FindFirst(ClaimTypes.NameIdentifier)?
            .Value;

        if (!int.TryParse(raw, out var userId))
        {
            throw new HubException(
                "Không xác định được người dùng."
            );
        }

        return userId;
    }

    public static string ConversationGroup(
        int conversationId)
    {
        return $"conversation:{conversationId}";
    }

    public static string UserGroup(
        int userId)
    {
        return $"user:{userId}";
    }
}