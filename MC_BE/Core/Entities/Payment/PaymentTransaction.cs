using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

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
    [MaxLength(50)]
    [Column("Provider")]
    public string Provider { get; set; } = "VNPAY";

    [MaxLength(100)]
    [Column("ProviderTransactionNo")]
    public string? ProviderTransactionNo { get; set; }

    [MaxLength(50)]
    [Column("ResponseCode")]
    public string? ResponseCode { get; set; }

    [MaxLength(50)]
    [Column("TransactionStatus")]
    public string? TransactionStatus { get; set; }

    [MaxLength(50)]
    [Column("BankCode")]
    public string? BankCode { get; set; }

    [Required]
    [Column("Amount", TypeName = "numeric(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("Status")]
    public string Status { get; set; } = "PENDING";

    [Column("SignatureValid")]
    public bool SignatureValid { get; set; }

    [Column("ProcessedAt")]
    public DateTime? ProcessedAt { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    [ForeignKey(nameof(PaymentId))]
    public virtual Payment Payment { get; set; } = null!;
}