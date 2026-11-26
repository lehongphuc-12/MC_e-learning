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

    [Column("IsAnonymous")]
    public bool IsAnonymous { get; set; } = true;

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

    [Column("ModeratedAt")]
    public DateTime? ModeratedAt { get; set; }

    [Column("DeletedAt")]
    public DateTime? DeletedAt { get; set; }

    [Column("ModeratedByAdminID")]
    public int? ModeratedByAdminId { get; set; }

    [MaxLength(1000)]
    [Column("ModerationReason", TypeName = "text")]
    public string? ModerationReason { get; set; }

    public virtual Course Course { get; set; } = null!;
    public virtual User Learner { get; set; } = null!;
    public virtual Certificate Certificate { get; set; } = null!;
    public virtual User? ModeratedByAdmin { get; set; }
}
