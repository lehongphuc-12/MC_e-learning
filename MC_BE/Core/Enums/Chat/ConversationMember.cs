using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums.Chat;

namespace MC_BE.Core.Entities.Chat;

[Table("conversation_members")]
public class ConversationMember
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ConversationMemberID")]
    public long ConversationMemberId { get; set; }

    [Required]
    [Column("ConversationID")]
    public int ConversationId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Required]
    [Column("Role")]
    public ConversationMemberRole Role { get; set; } = ConversationMemberRole.MEMBER;

    [Column("JoinedAt")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    [Column("IsActive")]
    public bool IsActive { get; set; } = true;

    [Column("LeftAt")]
    public DateTime? LeftAt { get; set; }

    [ForeignKey(nameof(ConversationId))]
    public Conversation Conversation { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}