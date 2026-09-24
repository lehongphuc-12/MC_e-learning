using MC_BE.Core.Entities;
using MC_BE.Core.Entities.Chat;
using MC_BE.Core.Enums.Chat;
using MC_BE.Features.Chat.DTOs;
using MC_BE.Features.Chat.Services.Interfaces;
using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Chat.Services;

public class CallService : ICallService
{
    private readonly SmartMcDbContext _context;
    private static readonly TimeSpan RingTimeout =
        TimeSpan.FromSeconds(60);

    public CallService(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<CallDto> StartCallAsync(
        int callerId,
        int conversationId,
        string callType)
    {
        var conversation = await _context.Conversations
            .FirstOrDefaultAsync(x =>
                x.ConversationId == conversationId)
            ?? throw new KeyNotFoundException(
                "Cuộc trò chuyện không tồn tại.");

        EnsureMember(conversation, callerId);

        if (!Enum.TryParse<CallType>(
                callType,
                true,
                out var parsedType) ||
            !Enum.IsDefined(parsedType))
        {
            throw new ArgumentException(
                "CallType chỉ nhận VOICE hoặc VIDEO.");
        }

        var receiverId =
            conversation.User1Id == callerId
                ? conversation.User2Id
                : conversation.User1Id;

        var receiverExists = await _context.Users
            .AnyAsync(x =>
                x.UserId == receiverId &&
                x.Status == "ACTIVE");

        if (!receiverExists)
        {
            throw new InvalidOperationException(
                "Người nhận không khả dụng.");
        }

        await ExpireStaleCallsAsync(
            callerId,
            receiverId);

        var busy = await _context.ChatCalls
            .AnyAsync(x =>
                (x.CallerId == callerId ||
                 x.ReceiverId == callerId ||
                 x.CallerId == receiverId ||
                 x.ReceiverId == receiverId) &&
                (x.Status == CallStatus.RINGING ||
                 x.Status == CallStatus.ACCEPTED));

        if (busy)
        {
            throw new InvalidOperationException(
                "Một trong hai người đang có cuộc gọi khác.");
        }

        var call = new ChatCall
        {
            ConversationId = conversationId,
            CallerId = callerId,
            ReceiverId = receiverId,
            CallType = parsedType,
            Status = CallStatus.RINGING,
            StartedAt = DateTime.UtcNow
        };

        _context.ChatCalls.Add(call);

        await _context.SaveChangesAsync();

        return await MapAsync(call.CallId);
    }

    public async Task<CallDto> AcceptCallAsync(
        int currentUserId,
        long callId)
    {
        var call = await GetCallAsync(callId);

        if (call.ReceiverId != currentUserId)
        {
            throw new UnauthorizedAccessException(
                "Bạn không phải người nhận cuộc gọi.");
        }

        if (call.Status != CallStatus.RINGING)
        {
            throw new InvalidOperationException(
                "Cuộc gọi không còn ở trạng thái chờ.");
        }

        if (DateTime.UtcNow - call.StartedAt > RingTimeout)
        {
            call.Status = CallStatus.MISSED;
            call.EndedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            throw new InvalidOperationException(
                "Cuộc gọi đã hết thời gian chờ.");
        }

        call.Status = CallStatus.ACCEPTED;
        call.AnsweredAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await MapAsync(callId);
    }

    public async Task<CallDto> RejectCallAsync(
        int currentUserId,
        long callId)
    {
        var call = await GetCallAsync(callId);

        if (call.ReceiverId != currentUserId)
        {
            throw new UnauthorizedAccessException(
                "Bạn không phải người nhận.");
        }

        if (call.Status != CallStatus.RINGING)
        {
            throw new InvalidOperationException(
                "Cuộc gọi không còn ở trạng thái chờ.");
        }

        call.Status = CallStatus.REJECTED;
        call.EndedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await MapAsync(callId);
    }

    public async Task<CallDto> EndCallAsync(
        int currentUserId,
        long callId)
    {
        var call = await GetCallAsync(callId);

        EnsureParticipant(call, currentUserId);

        if (call.Status != CallStatus.RINGING &&
            call.Status != CallStatus.ACCEPTED)
        {
            return await MapAsync(callId);
        }

        var now = DateTime.UtcNow;

        if (call.Status == CallStatus.RINGING)
        {
            call.Status =
                call.CallerId == currentUserId
                    ? CallStatus.CANCELLED
                    : CallStatus.REJECTED;
        }
        else
        {
            call.Status = CallStatus.ENDED;
        }

        call.EndedAt = now;

        if (call.AnsweredAt.HasValue)
        {
            call.DurationSeconds = Math.Max(
                0,
                (int)(now - call.AnsweredAt.Value)
                    .TotalSeconds);
        }

        await _context.SaveChangesAsync();

        return await MapAsync(callId);
    }

    public async Task<ChatCall> GetActiveCallAsync(
        int currentUserId,
        long callId)
    {
        var call = await GetCallAsync(callId);

        EnsureParticipant(call, currentUserId);

        if (call.Status != CallStatus.RINGING &&
            call.Status != CallStatus.ACCEPTED)
        {
            throw new InvalidOperationException(
                "Cuộc gọi không còn hoạt động.");
        }

        return call;
    }

    private async Task ExpireStaleCallsAsync(
        int firstUserId,
        int secondUserId)
    {
        var cutoff =
            DateTime.UtcNow - RingTimeout;

        var staleCalls = await _context.ChatCalls
            .Where(x =>
                x.Status == CallStatus.RINGING &&
                x.StartedAt < cutoff &&
                (x.CallerId == firstUserId ||
                 x.ReceiverId == firstUserId ||
                 x.CallerId == secondUserId ||
                 x.ReceiverId == secondUserId))
            .ToListAsync();

        if (staleCalls.Count == 0)
            return;

        var now = DateTime.UtcNow;

        foreach (var call in staleCalls)
        {
            call.Status = CallStatus.MISSED;
            call.EndedAt = now;
        }

        await _context.SaveChangesAsync();
    }

    private async Task<ChatCall> GetCallAsync(
        long callId)
    {
        return await _context.ChatCalls
            .FirstOrDefaultAsync(x =>
                x.CallId == callId)
            ?? throw new KeyNotFoundException(
                "Cuộc gọi không tồn tại.");
    }

    private async Task<CallDto> MapAsync(
        long callId)
    {
        var call = await _context.ChatCalls
            .AsNoTracking()
            .Include(x => x.Caller)
            .Include(x => x.Receiver)
            .FirstAsync(x =>
                x.CallId == callId);

        return new CallDto
        {
            CallId = call.CallId,
            ConversationId = call.ConversationId,
            CallerId = call.CallerId,
            CallerName = call.Caller.FullName,
            CallerAvatarUrl = call.Caller.AvatarUrl,
            ReceiverId = call.ReceiverId,
            ReceiverName = call.Receiver.FullName,
            ReceiverAvatarUrl = call.Receiver.AvatarUrl,
            CallType = call.CallType.ToString(),
            Status = call.Status.ToString(),
            StartedAt = call.StartedAt,
            AnsweredAt = call.AnsweredAt,
            EndedAt = call.EndedAt,
            DurationSeconds = call.DurationSeconds
        };
    }

    private static void EnsureMember(
        Conversation conversation,
        int userId)
    {
        if (conversation.User1Id != userId &&
            conversation.User2Id != userId)
        {
            throw new UnauthorizedAccessException(
                "Bạn không thuộc cuộc trò chuyện.");
        }
    }

    private static void EnsureParticipant(
        ChatCall call,
        int userId)
    {
        if (call.CallerId != userId &&
            call.ReceiverId != userId)
        {
            throw new UnauthorizedAccessException(
                "Bạn không thuộc cuộc gọi.");
        }
    }
}