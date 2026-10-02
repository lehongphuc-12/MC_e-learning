using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Chat.DTOs;

public class StartCallRequest
{
    [Range(1, int.MaxValue)]
    public int ConversationId { get; set; }

    [Required]
    public string CallType { get; set; } = string.Empty;
}

public class CallDto
{
    public long CallId { get; set; }
    public int ConversationId { get; set; }
    public int CallerId { get; set; }
    public string CallerName { get; set; } = string.Empty;
    public string? CallerAvatarUrl { get; set; }
    public int ReceiverId { get; set; }
    public string ReceiverName { get; set; } = string.Empty;
    public string? ReceiverAvatarUrl { get; set; }
    public string CallType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? AnsweredAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public int? DurationSeconds { get; set; }
}

public class WebRtcSessionDescriptionDto
{
    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = string.Empty;

    [Required]
    [MaxLength(100000)]
    public string Sdp { get; set; } = string.Empty;
}

public class IceCandidateDto
{
    [Required]
    [MaxLength(10000)]
    public string Candidate { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? SdpMid { get; set; }

    public int? SdpMLineIndex { get; set; }
}