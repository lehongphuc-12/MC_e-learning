using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("CATEGORY")]
public class Category
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("CategoryID")]
    public int CategoryId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("CategoryName")]
    public string CategoryName { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    [Column("Status")]
    public CategoryStatus Status { get; set; } = CategoryStatus.ACTIVE;

    // Navigation properties
    public virtual ICollection<Course> Courses { get; set; } = new List<Course>();
}
