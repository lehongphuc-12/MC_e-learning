using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Models.Entities;

[Table("ENROLLMENT")]
public class Enrollment
{
    [Key]
    [Column("EnrollmentID")]
    public int EnrollmentId { get; set; }

    [Column("LearnerID")]
    public int LearnerId { get; set; }

    [Column("CourseID")]
    public int CourseId { get; set; }

    [Column("PaymentID")]
    public int? PaymentId { get; set; }

    [Column("Status")]
    [StringLength(30)]
    public string Status { get; set; } = "PENDING_PAYMENT"; // PENDING_PAYMENT, ACTIVE, EXPIRED, CANCELLED, REVOKED, REFUNDED

    [Column("CompletionPercentage")]
    public decimal CompletionPercentage { get; set; } = 0;

    [Column("EnrolledAt")]
    public DateTime? EnrolledAt { get; set; }

    [Column("ExpiresAt")]
    public DateTime? ExpiresAt { get; set; } // Hạn dùng 90 ngày (3 tháng)

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("LearnerId")]
    public virtual User? Learner { get; set; }

    [ForeignKey("PaymentId")]
    public virtual Payment? Payment { get; set; }
}