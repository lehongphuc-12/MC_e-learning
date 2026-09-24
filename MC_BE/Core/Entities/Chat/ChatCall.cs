using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums.Chat ;

namespace MC_BE.Core.Entities.Chat;

[Table("chat_calls")]
public class ChatCall
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("CallID")]
    public long CallId { get; set; }

    [Required]
    [Column("ConversationID")]
    public int ConversationId { get; set; }

    [Required]
    [Column("CallerID")]
    public int CallerId { get; set; }

    [Required]
    [Column("ReceiverID")]
    public int ReceiverId { get; set; }

    [Required]
    [Column("CallType")]
    public CallType CallType { get; set; }

    [Required]
    [Column("Status")]
    public CallStatus Status { get; set; }
        = CallStatus.RINGING;

    [Column("StartedAt")]
    public DateTime StartedAt { get; set; }
        = DateTime.UtcNow;

    [Column("AnsweredAt")]
    public DateTime? AnsweredAt { get; set; }

    [Column("EndedAt")]
    public DateTime? EndedAt { get; set; }

    [Column("DurationSeconds")]
    public int? DurationSeconds { get; set; }

    [ForeignKey(nameof(ConversationId))]
    public Conversation Conversation { get; set; } = null!;

    [ForeignKey(nameof(CallerId))]
    public User Caller { get; set; } = null!;

    [ForeignKey(nameof(ReceiverId))]
    public User Receiver { get; set; } = null!;
}