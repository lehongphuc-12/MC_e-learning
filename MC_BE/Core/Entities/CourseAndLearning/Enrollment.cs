using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("ENROLLMENT")]
public class Enrollment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("EnrollmentID")]
    public int EnrollmentId { get; set; }

    [Required]
    [Column("LearnerID")]
    public int LearnerId { get; set; }

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING_PAYMENT";

    [Column("CompletionPercentage", TypeName = "numeric(5,2)")]
    public decimal CompletionPercentage { get; set; } = 0.00m;

    [Column("EnrolledAt")]
    public DateTime? EnrolledAt { get; set; }

    [Column("ExpiresAt")]
    public DateTime? ExpiresAt { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(LearnerId))]
    public virtual User Learner { get; set; } = null!;

    [ForeignKey(nameof(CourseId))]
    public virtual Course Course { get; set; } = null!;

    public virtual ICollection<PaymentItem> PaymentItems { get; set; } = new List<PaymentItem>();

    public virtual ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();
}