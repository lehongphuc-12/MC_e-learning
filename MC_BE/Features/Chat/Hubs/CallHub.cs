using System.Security.Claims;
using MC_BE.Core.Entities.Chat;
using MC_BE.Features.Chat.DTOs;
using MC_BE.Features.Chat.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MC_BE.Features.Chat.Hubs;

[Authorize]
public class CallHub : Hub
{
    private readonly ICallService _callService;

    public CallHub(ICallService callService)
    {
        _callService = callService;
    }

    public async Task StartCall(int conversationId, string callType)
    {
        var callerId = GetCurrentUserId();

        try
        {
            var call = await _callService.StartCallAsync(
                callerId,
                conversationId,
                callType);

            await Clients.User(call.ReceiverId.ToString())
                .SendAsync("IncomingCall", call);

            await Clients.Caller
                .SendAsync("CallStarted", call);
        }
        catch (Exception ex) when (IsExpectedException(ex))
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task AcceptCall(long callId)
    {
        var currentUserId = GetCurrentUserId();

        try
        {
            var call = await _callService.AcceptCallAsync(
                currentUserId,
                callId);

            await Clients.User(call.CallerId.ToString())
                .SendAsync("CallAccepted", call);

            await Clients.Caller
                .SendAsync("CallAccepted", call);
        }
        catch (Exception ex) when (IsExpectedException(ex))
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task RejectCall(long callId)
    {
        var currentUserId = GetCurrentUserId();

        try
        {
            var call = await _callService.RejectCallAsync(
                currentUserId,
                callId);

            await Clients.User(call.CallerId.ToString())
                .SendAsync("CallRejected", call);

            await Clients.Caller
                .SendAsync("CallRejected", call);
        }
        catch (Exception ex) when (IsExpectedException(ex))
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task EndCall(long callId)
    {
        var currentUserId = GetCurrentUserId();

        try
        {
            var call = await _callService.EndCallAsync(
                currentUserId,
                callId);

            var targetId = call.CallerId == currentUserId
                ? call.ReceiverId
                : call.CallerId;

            await Clients.User(targetId.ToString())
                .SendAsync("CallEnded", call);

            await Clients.Caller
                .SendAsync("CallEnded", call);
        }
        catch (Exception ex) when (IsExpectedException(ex))
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task SendOffer(
        long callId,
        WebRtcSessionDescriptionDto offer)
    {
        ValidateSdp(offer, "offer");
        var currentUserId = GetCurrentUserId();

        try
        {
            var call = await _callService.GetActiveCallAsync(
                currentUserId,
                callId);

            var targetId = GetOtherUser(call, currentUserId);

            await Clients.User(targetId.ToString())
                .SendAsync("ReceiveOffer", new
                {
                    callId,
                    fromUserId = currentUserId,
                    offer
                });
        }
        catch (Exception ex) when (IsExpectedException(ex))
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task SendAnswer(
        long callId,
        WebRtcSessionDescriptionDto answer)
    {
        ValidateSdp(answer, "answer");
        var currentUserId = GetCurrentUserId();

        try
        {
            var call = await _callService.GetActiveCallAsync(
                currentUserId,
                callId);

            var targetId = GetOtherUser(call, currentUserId);

            await Clients.User(targetId.ToString())
                .SendAsync("ReceiveAnswer", new
                {
                    callId,
                    fromUserId = currentUserId,
                    answer
                });
        }
        catch (Exception ex) when (IsExpectedException(ex))
        {
            throw new HubException(ex.Message);
        }
    }

    public async Task SendIceCandidate(
        long callId,
        IceCandidateDto candidate)
    {
        if (string.IsNullOrWhiteSpace(candidate.Candidate))
            throw new HubException("ICE candidate không hợp lệ.");

        var currentUserId = GetCurrentUserId();

        try
        {
            var call = await _callService.GetActiveCallAsync(
                currentUserId,
                callId);

            var targetId = GetOtherUser(call, currentUserId);

            await Clients.User(targetId.ToString())
                .SendAsync("ReceiveIceCandidate", new
                {
                    callId,
                    fromUserId = currentUserId,
                    candidate
                });
        }
        catch (Exception ex) when (IsExpectedException(ex))
        {
            throw new HubException(ex.Message);
        }
    }

    private int GetCurrentUserId()
    {
        var raw = Context.User?
            .FindFirst(ClaimTypes.NameIdentifier)?
            .Value;

        if (!int.TryParse(raw, out var userId))
            throw new HubException(
                "Không xác định được người dùng.");

        return userId;
    }

    private static int GetOtherUser(
        ChatCall call,
        int currentUserId)
    {
        return call.CallerId == currentUserId
            ? call.ReceiverId
            : call.CallerId;
    }

    private static void ValidateSdp(
        WebRtcSessionDescriptionDto dto,
        string expectedType)
    {
        if (!string.Equals(
                dto.Type,
                expectedType,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new HubException(
                $"SDP type phải là {expectedType}.");
        }

        if (string.IsNullOrWhiteSpace(dto.Sdp))
            throw new HubException("SDP không hợp lệ.");

        if (dto.Sdp.Length > 100000)
            throw new HubException("SDP quá lớn.");
    }

    private static bool IsExpectedException(Exception ex)
    {
        return ex is ArgumentException
            or InvalidOperationException
            or KeyNotFoundException
            or UnauthorizedAccessException;
    }
}