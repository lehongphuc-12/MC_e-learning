using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("UserLearningPreferences")]
public class UserLearningPreferences
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("Id")]
    public int Id { get; set; }

    [Required]
    [Column("UserId")]
    public int UserId { get; set; }

    [MaxLength(500)]
    [Column("TargetCategories")]
    public string? TargetCategories { get; set; }

    [MaxLength(50)]
    [Column("ExperienceLevel")]
    public string? ExperienceLevel { get; set; }

    [MaxLength(500)]
    [Column("FocusSkills")]
    public string? FocusSkills { get; set; }

    [Column("IsCompleted")]
    public bool IsCompleted { get; set; } = false;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
}
