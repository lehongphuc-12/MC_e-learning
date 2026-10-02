using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities.Chat;

[Table("sticker_packs")]
public class StickerPack
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("StickerPackID")]
    public int StickerPackId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("Name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    [Column("ThumbnailUrl")]
    public string? ThumbnailUrl { get; set; }

    [Column("IsActive")]
    public bool IsActive { get; set; } = true;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    public ICollection<Sticker> Stickers { get; set; }
        = new List<Sticker>();
}