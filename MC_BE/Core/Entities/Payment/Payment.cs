using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

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
    [Column("Amount", TypeName = "numeric(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(10)]
    [Column("Currency")]
    public string Currency { get; set; } = "VND";

    [Required]
    [MaxLength(30)]
    [Column("PaymentMethod")]
    public string PaymentMethod { get; set; } = "PAYOS";

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

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("ExpiresAt")]
    public DateTime ExpiresAt { get; set; }

    [ForeignKey(nameof(LearnerId))]
    public virtual User Learner { get; set; } = null!;

    public virtual ICollection<PaymentItem> Items { get; set; } = new List<PaymentItem>();

    public virtual ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
}