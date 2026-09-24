using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums.Chat;

namespace MC_BE.Core.Entities.Chat;

[Table("chat_messages")]
public class ChatMessage
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("MessageID")]
    public long MessageId { get; set; }

    [Required]
    [Column("ConversationID")]
    public int ConversationId { get; set; }

    [Required]
    [Column("SenderID")]
    public int SenderId { get; set; }

    [Column("Content")]
    [MaxLength(5000)]
    public string? Content { get; set; }

    [Required]
    [Column("MessageType")]
    public ChatMessageType MessageType { get; set; }

    [Required]
    [Column("Status")]
    public ChatMessageStatus Status { get; set; }
        = ChatMessageStatus.SENT;

    [Column("StickerID")]
    public int? StickerId { get; set; }

    [Column("ReplyToMessageID")]
    public long? ReplyToMessageId { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; }
        = DateTime.UtcNow;

    [Column("RecalledAt")]
    public DateTime? RecalledAt { get; set; }

    [ForeignKey(nameof(ConversationId))]
    public Conversation Conversation { get; set; } = null!;

    [ForeignKey(nameof(SenderId))]
    public User Sender { get; set; } = null!;

    [ForeignKey(nameof(StickerId))]
    public Sticker? Sticker { get; set; }

    [ForeignKey(nameof(ReplyToMessageId))]
    public ChatMessage? ReplyToMessage { get; set; }

    public ICollection<ChatMessage> Replies { get; set; }
        = new List<ChatMessage>();

    public ICollection<MessageAttachment> Attachments { get; set; }
        = new List<MessageAttachment>();

    public ICollection<MessageReaction> Reactions { get; set; }
        = new List<MessageReaction>();
}