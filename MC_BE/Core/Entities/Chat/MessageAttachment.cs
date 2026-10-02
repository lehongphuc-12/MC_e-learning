using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities.Chat;

[Table("message_attachments")]
public class MessageAttachment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("AttachmentID")]
    public long AttachmentId { get; set; }

    [Required]
    [Column("MessageID")]
    public long MessageId { get; set; }

    [Required]
    [MaxLength(1000)]
    [Column("FileUrl")]
    public string FileUrl { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("FileName")]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    [Column("MimeType")]
    public string MimeType { get; set; } = string.Empty;

    [Column("FileSize")]
    public long FileSize { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("AttachmentType")]
    public string AttachmentType { get; set; } = string.Empty;

    [Column("DurationSeconds")]
    public int? DurationSeconds { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    [ForeignKey(nameof(MessageId))]
    public ChatMessage Message { get; set; } = null!;
}