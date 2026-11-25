using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("course_reviews")]
public class CourseReview
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ReviewID")]
    public int ReviewId { get; set; }

    [Column("CourseID")]
    public int CourseId { get; set; }

    [Column("LearnerID")]
    public int LearnerId { get; set; }

    [Column("CertificateID")]
    public int CertificateId { get; set; }

    [Column("Rating", TypeName = "smallint")]
    public int Rating { get; set; }

    [MaxLength(2000)]
    [Column("Comment", TypeName = "text")]
    public string? Comment { get; set; }

    [Required, MaxLength(24)]
    [Column("Status")]
    public string Status { get; set; } = "PUBLISHED";

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual Course Course { get; set; } = null!;
    public virtual User Learner { get; set; } = null!;
    public virtual Certificate Certificate { get; set; } = null!;
}
