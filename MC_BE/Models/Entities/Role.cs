using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Models.Entities;

[Table("ROLE")]
public class Role
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("RoleID")]
    public int RoleId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("RoleName")]
    public string RoleName { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    // Navigation property
    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
