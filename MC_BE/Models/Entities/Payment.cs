using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Models.Entities;

[Table("PAYMENT")]
public class Payment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("PaymentID")]
    public int PaymentId { get; set; }

    [Required]
    [Column("LearnerID")]
    public int LearnerId { get; set; }

    [Required]
    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required]
    [Column("EnrollmentID")]
    public int EnrollmentId { get; set; }

    [Required]
    [Column("Amount", TypeName = "numeric(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(10)]
    [Column("Currency")]
    public string Currency { get; set; } = "VND";

    [Required]
    [MaxLength(30)]
    [Column("PaymentMethod")]
    public string PaymentMethod { get; set; } = "VNPAY";

    [Required]
    [MaxLength(30)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING";

    [Required]
    [MaxLength(100)]
    [Column("MerchantTxnRef")]
    public string MerchantTxnRef { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("OrderInfo")]
    public string? OrderInfo { get; set; }

    [MaxLength(100)]
    [Column("VnPayTransactionNo")]
    public string? VnPayTransactionNo { get; set; }

    [MaxLength(20)]
    [Column("VnPayResponseCode")]
    public string? VnPayResponseCode { get; set; }

    [MaxLength(20)]
    [Column("VnPayTransactionStatus")]
    public string? VnPayTransactionStatus { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("ExpiresAt")]
    public DateTime ExpiresAt { get; set; }

    [ForeignKey(nameof(LearnerId))]
    public virtual User Learner { get; set; } = null!;

    [ForeignKey(nameof(EnrollmentId))]
    public virtual Enrollment Enrollment { get; set; } = null!;

    public virtual ICollection<PaymentTransaction> Transactions { get; set; }
        = new List<PaymentTransaction>();
}