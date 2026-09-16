using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Models.Entities;

[Table("PAYMENT_TRANSACTION")]
public class PaymentTransaction
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("TransactionID")]
    public int TransactionId { get; set; }

    [Required]
    [Column("PaymentID")]
    public int PaymentId { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("Provider")]
    public string Provider { get; set; } = "VNPAY";

    [MaxLength(100)]
    [Column("ProviderTransactionNo")]
    public string? ProviderTransactionNo { get; set; }

    [MaxLength(20)]
    [Column("ResponseCode")]
    public string? ResponseCode { get; set; }

    [MaxLength(20)]
    [Column("TransactionStatus")]
    public string? TransactionStatus { get; set; }

    [MaxLength(30)]
    [Column("BankCode")]
    public string? BankCode { get; set; }

    [Column("Amount", TypeName = "numeric(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(30)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING";

    [Column("SignatureValid")]
    public bool SignatureValid { get; set; }

    [Column("ProcessedAt")]
    public DateTime? ProcessedAt { get; set; }

    [Column("RawPayload")]
    public string? RawPayload { get; set; }

    [ForeignKey(nameof(PaymentId))]
    public virtual Payment Payment { get; set; } = null!;
}