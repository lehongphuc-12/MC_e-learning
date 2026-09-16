using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("USER_PROFILE")]
public class UserProfile
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ProfileID")]
    public int ProfileId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Column("Bio")]
    public string? Bio { get; set; }

    [MaxLength(10)]
    [Column("Gender")]
    public string? Gender { get; set; }

    [Column("DateOfBirth")]
    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(50)]
    [Column("ExperienceLevel")]
    public string? ExperienceLevel { get; set; }

    [Column("LearningGoal")]
    public string? LearningGoal { get; set; }

    [MaxLength(10)]
    [Column("PreferredLanguage")]
    public string PreferredLanguage { get; set; } = "en";

    // Navigation property
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
}
