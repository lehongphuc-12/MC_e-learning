using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities.Chat;

[Table("conversations")]
public class Conversation
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ConversationID")]
    public int ConversationId { get; set; }

    [Required]
    [Column("User1ID")]
    public int User1Id { get; set; }

    [Required]
    [Column("User2ID")]
    public int User2Id { get; set; }

    [Column("LastMessageAt")]
    public DateTime? LastMessageAt { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(User1Id))]
    public User User1 { get; set; } = null!;

    [ForeignKey(nameof(User2Id))]
    public User User2 { get; set; } = null!;

    public ICollection<ChatMessage> Messages { get; set; }
        = new List<ChatMessage>();

    public ICollection<ConversationRead> Reads { get; set; }
        = new List<ConversationRead>();

    public ICollection<ChatCall> Calls { get; set; }
        = new List<ChatCall>();
}