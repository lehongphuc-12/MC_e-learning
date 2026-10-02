using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Chat.DTOs;

public class CreateConversationRequest
{
    [Range(1, int.MaxValue)]
    public int OtherUserId { get; set; }
}

public class SendTextMessageRequest
{
    [Range(1, int.MaxValue)]
    public int ConversationId { get; set; }

    [Required]
    [StringLength(5000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;

    public long? ReplyToMessageId { get; set; }
}

public class SendStickerRequest
{
    [Range(1, int.MaxValue)]
    public int ConversationId { get; set; }

    [Range(1, int.MaxValue)]
    public int StickerId { get; set; }

    public long? ReplyToMessageId { get; set; }
}

public class SendAttachmentRequest
{
    [Range(1, int.MaxValue)]
    public int ConversationId { get; set; }

    [Required]
    public IFormFile File { get; set; } = null!;

    public long? ReplyToMessageId { get; set; }
}

public class SendVoiceMessageRequest
{
    [Range(1, int.MaxValue)]
    public int ConversationId { get; set; }

    [Required]
    public IFormFile Audio { get; set; } = null!;

    [Range(1, 600)]
    public int DurationSeconds { get; set; }

    public long? ReplyToMessageId { get; set; }
}

public class ReactMessageRequest
{
    [Required]
    [MaxLength(20)]
    public string Reaction { get; set; } = string.Empty;
}

public class ForwardMessageRequest
{
    [Required]
    [MinLength(1)]
    public List<int> ConversationIds { get; set; } = new();
}

public class ConversationDto
{
    public int ConversationId { get; set; }
    public int OtherUserId { get; set; }
    public string OtherUserName { get; set; } = string.Empty;
    public string? OtherUserAvatarUrl { get; set; }
    public DateTime? OtherUserLastSeenAt { get; set; }
    public ChatMessageDto? LastMessage { get; set; }
    public int UnreadCount { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ChatMessageDto
{
    public long MessageId { get; set; }
    public int ConversationId { get; set; }
    public int SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string? SenderAvatarUrl { get; set; }
    public string? Content { get; set; }
    public string MessageType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? RecalledAt { get; set; }
    public StickerDto? Sticker { get; set; }
    public ReplyMessageDto? ReplyTo { get; set; }
    public List<AttachmentDto> Attachments { get; set; } = new();
    public List<ReactionDto> Reactions { get; set; } = new();
    public bool IsRead { get; set; }
}

public class ReplyMessageDto
{
    public long MessageId { get; set; }
    public int SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string MessageType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class AttachmentDto
{
    public long AttachmentId { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string AttachmentType { get; set; } = string.Empty;
    public int? DurationSeconds { get; set; }
}

public class ReactionDto
{
    public long ReactionId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Reaction { get; set; } = string.Empty;
}

public class ChatUserDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public int? ConversationId { get; set; }
    public DateTime? LastSeenAt { get; set; }
}

public class StickerDto
{
    public int StickerId { get; set; }
    public int StickerPackId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
}

public class StickerPackDto
{
    public int StickerPackId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public List<StickerDto> Stickers { get; set; } = new();
}

public class ChatPagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}

public class ChatUserProfileDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Role { get; set; }
    public string? Bio { get; set; }
    public string? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? ExperienceLevel { get; set; }
    public string? LearningGoal { get; set; }
    public string? PreferredLanguage { get; set; }
}