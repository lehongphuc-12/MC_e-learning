using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("REFRESH_TOKEN")]
public class RefreshToken
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("RefreshTokenID")]
    public int RefreshTokenId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("Token")]
    public string Token { get; set; } = string.Empty;

    [Required]
    [Column("ExpiresAt")]
    public DateTime ExpiresAt { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("RevokedAt")]
    public DateTime? RevokedAt { get; set; }

    [MaxLength(255)]
    [Column("ReplacedByToken")]
    public string? ReplacedByToken { get; set; }

    [NotMapped]
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;

    [NotMapped]
    public bool IsRevoked => RevokedAt != null;

    [NotMapped]
    public bool IsActive => !IsRevoked && !IsExpired;

    // Navigation property
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
}
