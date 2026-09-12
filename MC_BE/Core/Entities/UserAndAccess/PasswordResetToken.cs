using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("PASSWORD_RESET_TOKEN")]
public class PasswordResetToken
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("TokenID")]
    public int TokenId { get; set; }

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

    [Column("IsUsed")]
    public bool IsUsed { get; set; } = false;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
}
