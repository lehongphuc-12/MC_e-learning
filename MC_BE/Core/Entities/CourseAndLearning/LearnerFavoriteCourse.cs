using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("learner_favorite_courses")]
public class LearnerFavoriteCourse
{
    [Column("LearnerID")]
    public int LearnerId { get; set; }
    [Column("CourseID")]
    public int CourseId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual User Learner { get; set; } = null!;
    public virtual Course Course { get; set; } = null!;
}
