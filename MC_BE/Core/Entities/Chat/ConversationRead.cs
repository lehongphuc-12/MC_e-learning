using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities.Chat;

[Table("conversation_reads")]
public class ConversationRead
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ConversationReadID")]
    public long ConversationReadId { get; set; }

    [Required]
    [Column("ConversationID")]
    public int ConversationId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Column("LastReadMessageID")]
    public long? LastReadMessageId { get; set; }

    [Column("ReadAt")]
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ConversationId))]
    public Conversation Conversation { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}