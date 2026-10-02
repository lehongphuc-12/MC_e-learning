using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities.Chat;

[Table("message_reactions")]
public class MessageReaction
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ReactionID")]
    public long ReactionId { get; set; }

    [Required]
    [Column("MessageID")]
    public long MessageId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("Reaction")]
    public string Reaction { get; set; } = string.Empty;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    [ForeignKey(nameof(MessageId))]
    public ChatMessage Message { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}