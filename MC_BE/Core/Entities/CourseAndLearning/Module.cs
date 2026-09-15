using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("MODULE")]
public class Module
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ModuleID")]
    public int ModuleId { get; set; }

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 1;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("CourseId")]
    public virtual Course Course { get; set; } = null!;

    public virtual ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}
