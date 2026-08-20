using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Models.Entities;

[Table("USER")]
public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("UserID")]
    public int UserId { get; set; }

    [Required]
    [Column("RoleID")]
    public int RoleId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("FullName")]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    [EmailAddress]
    [Column("Email")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("PasswordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("PhoneNumber")]
    public string? PhoneNumber { get; set; }

    [MaxLength(255)]
    [Column("AvatarUrl")]
    public string? AvatarUrl { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("Status")]
    public string Status { get; set; } = "ACTIVE";

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("LastLoginAt")]
    public DateTime? LastLoginAt { get; set; }

    // Navigation properties
    [ForeignKey("RoleId")]
    public virtual Role Role { get; set; } = null!;

    public virtual UserProfile? UserProfile { get; set; }
}
