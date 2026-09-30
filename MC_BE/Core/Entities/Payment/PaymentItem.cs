using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("PAYMENT_ITEM")]
public class PaymentItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("PaymentItemID")]
    public int PaymentItemId { get; set; }

    [Required]
    [Column("PaymentID")]
    public int PaymentId { get; set; }

    [Required]
    [Column("EnrollmentID")]
    public int EnrollmentId { get; set; }

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [Column("Amount", TypeName = "numeric(18,2)")]
    public decimal Amount { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(PaymentId))]
    public virtual Payment Payment { get; set; } = null!;

    [ForeignKey(nameof(EnrollmentId))]
    public virtual Enrollment Enrollment { get; set; } = null!;

    [ForeignKey(nameof(CourseId))]
    public virtual Course Course { get; set; } = null!;
}