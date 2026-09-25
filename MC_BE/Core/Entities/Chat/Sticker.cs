using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities.Chat;

[Table("stickers")]
public class Sticker
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("StickerID")]
    public int StickerId { get; set; }

    [Required]
    [Column("StickerPackID")]
    public int StickerPackId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("Name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    [Column("ImageUrl")]
    public string ImageUrl { get; set; } = string.Empty;

    [Column("IsActive")]
    public bool IsActive { get; set; } = true;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    [ForeignKey(nameof(StickerPackId))]
    public StickerPack StickerPack { get; set; } = null!;
}