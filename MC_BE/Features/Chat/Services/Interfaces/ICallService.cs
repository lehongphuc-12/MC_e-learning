using MC_BE.Core.Entities.Chat;
using MC_BE.Features.Chat.DTOs;

namespace MC_BE.Features.Chat.Services.Interfaces;

public interface ICallService
{
    Task<CallDto> StartCallAsync(
        int callerId,
        int conversationId,
        string callType);

    Task<CallDto> AcceptCallAsync(
        int currentUserId,
        long callId);

    Task<CallDto> RejectCallAsync(
        int currentUserId,
        long callId);

    Task<CallDto> EndCallAsync(
        int currentUserId,
        long callId);

    Task<ChatCall> GetActiveCallAsync(
        int currentUserId,
        long callId);
}