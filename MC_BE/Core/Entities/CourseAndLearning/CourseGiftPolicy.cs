using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("course_gift_policies")]
public sealed class CourseGiftPolicy
{
    [Key]
    public int PolicyId { get; set; }

    [Required]
    public int GiftCourseId { get; set; }

    [Required]
    public bool IsActive { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(GiftCourseId))]
    public Course GiftCourse { get; set; } = null!;

    [ForeignKey(nameof(UpdatedByAdminId))]
    public User? UpdatedByAdmin { get; set; }
}
